/* eslint-disable */

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const busboy = require("busboy");
const axios = require("axios");
require("dotenv").config();

// Firebase Admin SDK configuration
const { admin, db } = require("./config/firebase-config"); // Ensure firebase-config.js only initializes Firebase once

// Initialize Express app
const app = express();
app.use(cors());
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routers
const userRouter = require("./routes/users");
const imageRouter = require("./routes/images");

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send({ data: "AgriLens firebase functions" });
});

// Analyze endpoint for Qwen
app.post("/analyze/qwen", (req, res) => {
  console.log("analyze/qwen called");
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const bb = busboy({ headers: req.headers });
  let fileBuffer = null;

  bb.on("file", (name, file) => {
    const chunks = [];
    file.on("data", (data) => chunks.push(data));
    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
      console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
    });
  });

  bb.on("finish", async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const base64Image = fileBuffer.toString("base64");
    console.log("Sending request to Hyperbolic API for Qwen...");

    try {
      // Hyperbolic API request to Qwen model
      const hyperbolicQwenResponse = await axios.post(
        "https://api.hyperbolic.xyz/v1/chat/completions",
        {
          model: "Qwen/Qwen2-VL-72B-Instruct",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant specialized in plant health analysis. Analyze the given image and provide a structured response in the following object notation:
{
  "overall_health_status": "Healthy|Mild Issues|Moderate Issues|Severe Issues",
  "health_score": <number between 0 and 100>,
  "pest_identification": "<description of any pests found or 'None detected'>",
  "disease_identification": "<description of any diseases found or 'None detected'>",
  "weed_presence": "<description of any weeds found or 'None detected'>",
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    ...
  ]
}
Ensure all fields are filled out based on your analysis of the image.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this plant image for health issues:",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
          },
        }
      );

      // Extract and log results
      const hyperbolicQwenResult = hyperbolicQwenResponse.data.choices[0].message.content;
      console.log("Received response from Qwen model");

      res.status(200).json({
        message: "Analysis completed by Qwen model",
        result: hyperbolicQwenResult,
      });
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      res.status(500).json({
        error: "An error occurred during analysis by Qwen model",
        details: error.response ? error.response.data : error.message,
      });
    }
  });

  bb.end(req.rawBody);
});

// Chat Follow-Up Endpoint without Firebase Storage
app.post("/chat/follow-up", async (req, res) => {
  const {
    initialAnalysis, // The previous analysis result we want to reference
    model, // 'qwen' or 'llama' to maintain consistency with the same model
    message, // User's follow-up question
    conversationId // To maintain chat history (not stored currently) but we should in the future, 
  } = req.body;

  if (!initialAnalysis || !model || !message) {
    return res.status(400).json({
      error: "Missing required parameters: initialAnalysis, model, or message"
    });
  }

  // Construct the conversation history
  const basePrompt = `Previous plant analysis: ${JSON.stringify(initialAnalysis)}
User's follow-up question: ${message}

As a plant health assistant, provide a detailed response to the follow-up question while considering the initial analysis. Focus on providing practical, actionable advice.`;

  try {
    const modelConfig = {
      'qwen': 'Qwen/Qwen2-VL-72B-Instruct',
      'llama': 'mistralai/Pixtral-12B-2409' // llama isn't supported unless it's the LLM
    };

    const response = await axios.post(
      "https://api.hyperbolic.xyz/v1/chat/completions",
      {
        model: modelConfig[model],
        messages: [
          {
            role: "system",
            content: "You are an expert plant health assistant. Use the previous analysis and provide specific, detailed answers to follow-up questions. Focus on practical advice and explanations."
          },
          {
            role: "user",
            content: basePrompt
          }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`
        }
      }
    );

    // Respond directly without storing conversation history, we should change this in the future 
    res.status(200).json({
      message: "Follow-up response generated",
      result: response.data.choices[0].message.content,
      conversationId: conversationId // Included for reference only
    });

  } catch (error) {
    console.error("Error in follow-up chat:", error);
    res.status(500).json({
      error: "An error occurred during follow-up analysis",
      details: error.response ? error.response.data : error.message
    });
  }
});

// Chat History Endpoint
app.get("/chat/history/:conversationId", async (req, res) => {
  try {
    const conversationRef = db.collection('conversations').doc(req.params.conversationId);
    const conversation = await conversationRef.get();
    
    if (!conversation.exists) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.status(200).json({
      conversationId: req.params.conversationId,
      history: conversation.data().messages
    });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({
      error: "An error occurred while retrieving chat history",
      details: error.message
    });
  }
});

// Additional routes for user and image handling
app.use("/users", userRouter);
app.use("/images", imageRouter);

// Catch-all route for invalid endpoints
app.get("/*", (req, res) => {
  res.status(200).send({ data: "Endpoint is not valid" });
});

// Export the app as a Firebase Cloud Function
exports.app = functions.https.onRequest(app);
