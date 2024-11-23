/* eslint-disable */
const functions = require("firebase-functions");
// const admin = require("firebase-admin");
const { admin, db, bucket } = require("./config/firebase-config");
const express = require("express");
const cors = require("cors");
const busboy = require("busboy");
const axios = require("axios");
require("dotenv").config();

// Internal Methods
const uploadImageToFirebase = require("./methods/uploadImageToFirebase");
const uploadFollowUpToFirebase = require("./methods/uploadFollowUpToFirebase");
const getAnalysis = require("./methods/getAnalysis");
const getPlantIdAnalysis = require("./methods/getPlantIdAnalysis");

const app = express();
app.use(cors());
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const middleware = require("./middleware");
const userRouter = require("./routes/users");
const imageRouter = require("./routes/images");
const usersApi = require("./routes/api/db");

app.get("/", (req, res) => {
  res.status(200).send({ data: "AgriLens firebase functions" });
});

app.post("/analyze", (req, res) => {
  console.log("analyze called");
  if (req.method !== "POST") {
    // Since the endpoint is `app.post`, this block will never be excuted
    return res.status(405).end();
  }

  const userID = req.headers["userid"];

  const bb = busboy({ headers: req.headers });
  let fileBuffer = null;
  let requestedInsights = [];

  bb.on("file", (name, file, info) => {
    console.log(`Processing file`);
    const chunks = [];
    file.on("data", (data) => {
      chunks.push(data);
    });
    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
      console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
    });
  });

  bb.on("field", (name, val) => {
    if (name !== "image") {
      requestedInsights.push(val);
      console.log(`Processed non-image field ${name}: ${val}.`);
    }
  });

  bb.on("finish", async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // console.log("requestedInsights: ", requestedInsights);

    try {
      const scanId = Date.now();
      const fileName = `plant_image_${scanId}.jpg`; // Unique name for each scanned image.
      // const imageUrl = await uploadImageToFirebase(fileBuffer, f ileName);// Send the binary format to firebase.
      // Start the image upload asynchronously. This will avoid blocking the rest of api calls.
      let imageUrl = "";
      let isImageValid = true;

      const base64Image = fileBuffer.toString("base64");
      // const userSelectedInsights =
      //   requestedInsights.length !== 0
      //     ? `The user has requested only the following insights: ${requestedInsights.join(", ")}.`
      //     : ""; // The user has not requested any specific insights.

      // console.log("userSelectedInsights:", userSelectedInsights);

      let results = [];
      let apiUrl = "https://api.hyperbolic.xyz/v1/chat/completions";
      let modelSpecification = {
        model: "Qwen/Qwen2-VL-7B-Instruct",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant specialized in plant health analysis.
            Analyze the given image and provide a structured response in the following format:
              {
                "plant_id": "<Common name of the plant or 'None detected'>",
                "overall_health_status": "Healthy|Mild Issues|Moderate Issues|Severe Issues",
                "health_score": <number between 0 and 100>,
                "pest_identification": "<description of any pests found or 'None detected'>",
                "disease_identification": "<description of any diseases found or 'None detected'>",
                "weed_presence": "<description of any weeds found or 'None detected'>",
                "recommendations": [
                  "<recommendation 1>",
                  "<recommendation 2>",
                  ...
                ],
                "summary": "Summarize the results you've found, including the health score number. This summary will be used as a prompt for follow-up chats."
              }
              Ensure all fields are filled out based on your analysis of the image. If the provided image is not a plant image, respond with just:
              {
                "plant_id": "Invalid Plant Image"
              }
              `,
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
      };
      let headersSpec = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
      };

      // Commenting out plantId calls for now
      // const [qwenResult, llamaResult, plantIDResult] = await Promise.allSettled(
      const [qwenResult, llamaResult] = await Promise.allSettled([
        getAnalysis(apiUrl, modelSpecification, headersSpec),
        getAnalysis(
          apiUrl,
          { ...modelSpecification, model: "mistralai/Pixtral-12B-2409" },
          headersSpec
        ),
        // getPlantIdAnalysis(base64Image, {
        //   identification: true,
        //   health_assessment: false,
        // }),
      ]);

      // Process Qwen result
      if (qwenResult.status === "fulfilled") {
        if (
          qwenResult.value.plant_id === "Invalid Plant Image" ||
          qwenResult.value.summary
            .toLowerCase()
            .includes("image does not contain a plant")
        ) {
          isImageValid = false;
        } else {
          results.push({ qwen: qwenResult.value });
          isImageValid = true;
        }
        console.log(">>> qwenResult added.: ", qwenResult.value.plant_id);
      } else {
        console.error("Qwen analysis failed:", qwenResult.reason);
        results.push([
          "qwen",
          {
            error: "Failed to retrieve Qwen analysis",
            details: qwenResult.reason.message,
          },
        ]);
      }

      // Process LLama result
      if (llamaResult.status === "fulfilled") {
        if (llamaResult.value.plant_id === "Invalid Plant Image") {
          isImageValid = false;
        } else {
          results.push({ llama: llamaResult.value });
          isImageValid = true;
        }
        console.log(">>> llamaResult added.");
      } else {
        console.error("LLama analysis failed:", llamaResult.reason);
        results.push([
          "llama",
          {
            error: "Failed to retrieve LLama analysis",
            details: llamaResult.reason.message,
          },
        ]);
      }

      // // Process PlantID result
      // if (plantIDResult.status === "fulfilled") {
      //   results.push(["plantid", plantIDResult.value]);
      // } else {
      //   console.error("PlantID analysis failed:", plantIDResult.reason);
      //   results.push([
      //     "plantid",
      //     {
      //       error: "Failed to retrieve PlantID analysis",
      //       details: plantIDResult.reason.message,
      //     },
      //   ]);
      // }

      uploadImageToFirebase(
        userID,
        scanId,
        fileBuffer,
        fileName,
        results.length > 0 && isImageValid ? results[0] : []
      )
        .then((imageUrl) => {
          console.log("Image uploaded to Firebase Storage:", imageUrl);
        })
        .catch((err) => {
          console.error("Failed to upload image:", err);
        });

      res.status(200).json({
        message: "Analysis completed and logged",
        isImageValid: isImageValid,
        imageUrl: imageUrl,
        scanId: scanId,
        results: results,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        error: "An error occurred during analysis",
        details: error.message,
      });
    }
  });

  bb.end(req.rawBody);
});

// Chat Follow-Up Endpoint
app.post("/chat/follow-up", async (req, res) => {
  const {
    initialAnalysis, // The previous analysis result we want to reference
    model, // 'qwen' or 'llama' to maintain consistency with the same model
    message, // User's follow-up question
    conversationId, // To maintain chat history (not stored currently) but we should in the future,
    userID,
  } = req.body;

  if (!initialAnalysis || !model || !message) {
    // console.log(">>>>> ERROR: Missing required parameters.");
    return res.status(400).json({
      error: "Missing required parameters: initialAnalysis, model, or message",
    });
  }
  uploadFollowUpToFirebase(
    userID,
    conversationId,
    "user",
    message,
    initialAnalysis
  );

  console.log(">>>> 11. model: ", model);
  console.log(">>>> 22. messages: ", message);
  console.log(">>>> 33. initialAnalysis: ", initialAnalysis);
  console.log(">>>> 44. conversationId: ", conversationId);

  // Construct the conversation history
  const basePrompt = `Previous plant analysis: ${JSON.stringify(
    initialAnalysis
  )}
User's follow-up question: ${message}

As a plant health assistant, provide a detailed response to the follow-up question while considering the initial analysis. Focus on providing practical, actionable advice. Use proper Markdown to format the result content.`;

  try {
    const modelConfig = {
      qwen: "Qwen/Qwen2-VL-72B-Instruct",
      llama: "mistralai/Pixtral-12B-2409",
    };

    const response = await axios.post(
      "https://api.hyperbolic.xyz/v1/chat/completions",
      {
        model: modelConfig[model],
        messages: [
          {
            role: "system",
            content:
              "You are an expert plant health assistant chatbot for the AgriLens. This app provides users with a plant diagnosis service, where users can submit a plant picture and AgriLens, using an LVM, provides analysis results. Use the previous analysis and provide specific, detailed answers to follow-up questions. Focus on practical advice and explanations.",
          },
          {
            role: "user",
            content: basePrompt,
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

    const modelReponse = response?.data?.choices[0].message?.content;
    uploadFollowUpToFirebase(
      userID,
      conversationId,
      model,
      modelReponse,
      initialAnalysis
    );

    // Respond directly without storing conversation history, we should change this in the future
    res.status(200).json({
      message: "Follow-up response generated",
      response: modelReponse,
      conversationId: conversationId, // Included for reference only
    });
  } catch (error) {
    console.error("Error in follow-up chat:", error);
    res.status(500).json({
      error: "An error occurred during follow-up analysis",
      details: error.response ? error.response.data : error.message,
    });
  }
});

app.use("/users", userRouter);
app.use("/images", imageRouter);
app.use("/api/users", usersApi);

// app.use(middleware.decodeToken);
app.get("/auth", (req, res) => {
  res.status(200).send({ data: "Authorized: AgriLens firebase functions" });
});

app.get("/*", (req, res) => {
  res.status(200).send({ data: "Endpoint is not valid" });
});

exports.app = functions.https.onRequest(app);

// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
