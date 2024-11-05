/* eslint-disable */

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const busboy = require("busboy");
const axios = require("axios");
const multer = require("multer");
require("dotenv").config();
const upload = multer({ memory: true });

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
const plantApi = require("./routes/api/plants");

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send({ data: "AgriLens firebase functions" });
});

// Analyze endpoint with both Hyperbolic and Plant ID API requests
app.post("/analyze", (req, res) => {
  console.log("analyze called");
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const bb = busboy({ headers: req.headers });
  let fileBuffer = null;
  let requestedInsights = [];

  bb.on("file", (name, file) => {
    const chunks = [];
    file.on("data", (data) => chunks.push(data));
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

    const base64Image = fileBuffer.toString("base64");
    console.log("Sending requests to Hyperbolic and Plant ID APIs...");

    try {
      // Hyperbolic API request
      const hyperbolicResponse = await axios.post(
        "https://api.hyperbolic.xyz/v1/chat/completions",
        {
          model: "Qwen/Qwen2-VL-72B-Instruct",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant specialized in plant health analysis. Analyze the given image and provide structured information.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this plant image for health issues:" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
              ],
            },
          ],
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
          },
        }
      );

      // Plant ID API request
      const plantIdResponse = await axios.post(
        "https://api.plant.id/v3/identification",
        {
          images: [base64Image],
          health: "all",
        },
        {
          headers: {
            "Api-Key": process.env.PLANT_ID_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      // Extract and log results
      const hyperbolicResult = hyperbolicResponse.data.choices[0].message.content;
      const plantIdResult = plantIdResponse.data;
      console.log("Received responses from both APIs");

      res.status(200).json({
        message: "Analysis completed",
        hyperbolicResult,
        plantIdResult,
      });
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      res.status(500).json({
        error: "An error occurred during analysis",
        details: error.response ? error.response.data : error.message,
      });
    }
  });

  bb.end(req.rawBody);
});

// Route to retrieve plant information
app.get("/api/plants", (req, res) => {
  console.log("Request for plant data");
  res.json({
    plants: [
      {
        name: "Beans",
        growthTime: "60-90 days",
        idealConditions: {
          sunlight: "Full sun",
          temperature: "70-90°F (21-32°C)",
          soilType: "Well-drained, loamy soil",
        },
        yield: "1-2 tons per acre",
      },
      {
        name: "Wheat",
        growthTime: "120-150 days",
        idealConditions: {
          sunlight: "Full sun",
          temperature: "60-75°F (15-24°C)",
          soilType: "Well-drained, fertile soil",
        },
        yield: "3-4 tons per acre",
      },
      {
        name: "Banana",
        growthTime: "9-12 months",
        idealConditions: {
          sunlight: "Full sun",
          temperature: "75-95°F (24-35°C)",
          soilType: "Rich, well-drained soil",
        },
        yield: "10-20 tons per acre",
      },
    ],
  });
});

// Additional routes for user and image handling
app.use("/users", userRouter);
app.use("/images", imageRouter);
app.use("/api/plants", plantApi);

// Catch-all route for invalid endpoints
app.get("/*", (req, res) => {
  res.status(200).send({ data: "Endpoint is not valid" });
});

// Export the app as a Firebase Cloud Function
exports.app = functions.https.onRequest(app);

