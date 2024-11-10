/* eslint-disable */
const functions = require("firebase-functions");
// const admin = require("firebase-admin");
const { admin, db } = require("./config/firebase-config");
const express = require("express");
const cors = require("cors");
const busboy = require("busboy");
const axios = require("axios");
require("dotenv").config();

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

    console.log("requestedInsights: ", requestedInsights);

    try {
      // console.log("Sending request to Hyperbolic API...");
      const base64Image = fileBuffer.toString("base64");

      let results = [];
      let apiUrl = "https://api.hyperbolic.xyz/v1/chat/completions";
      let modelSpecification = {
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
      };
      let headersSpec = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
      };

      const [qwenResult, llamaResult, plantIDResult] = await Promise.allSettled(
        [
          getAnalysis(apiUrl, modelSpecification, headersSpec),
          getAnalysis(
            apiUrl,
            { ...modelSpecification, model: "mistralai/Pixtral-12B-2409" },
            headersSpec
          ),
          getPlantIdAnalysis(base64Image, {
            identification: true,
            health_assessment: false,
          }),
        ]
      );

      // Process Qwen result
      if (qwenResult.status === "fulfilled") {
        results.push(["qwen", qwenResult.value]);
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
        results.push(["llama", llamaResult.value]);
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

      // Process PlantID result
      if (plantIDResult.status === "fulfilled") {
        results.push(["plantid", plantIDResult.value]);
      } else {
        console.error("PlantID analysis failed:", plantIDResult.reason);
        results.push([
          "plantid",
          {
            error: "Failed to retrieve PlantID analysis",
            details: plantIDResult.reason.message,
          },
        ]);
      }

      res.status(200).json({
        message: "Analysis completed and logged",
        // id: docRef.id,
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

const getAnalysis = async (apiUrl, modelSpec, headers) => {
  console.log("getAalyzes() called.", modelSpec.model);
  const apiResponse = await axios.post(apiUrl, modelSpec, {
    headers: headers,
  });
  const analysisResult = apiResponse.data.choices[0].message.content;
  // console.log("analysisResult: ", analysisResult);

  return analysisResult;
};

const getPlantIdAnalysis = async (imageData, insights) => {
  console.log("getPlantIdAnalysis() called.");

  // Construct the request payload
  let data = JSON.stringify({
    images: [imageData],
    latitude: 49.207, // Default values
    longitude: 16.608,
    // similar_images: true, // True returns simmilar images, if exists, to the input image
  });

  // TODO
  let requestType = insights.identification
    ? "identification"
    : "health_assessment";

  // Initial POST request config
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://plant.id/api/v3/identification", // TODO
    headers: {
      "Api-Key": process.env.PLANT_ID_API_KEY,
      "Content-Type": "application/json",
    },
    data: data,
  };

  let apiResponse = "";

  try {
    // POST request to PlantID
    const postResponse = await axios(config);
    console.log(">>> 1. Successful POST req to PlantID");

    const access_token = postResponse.data.access_token;

    // config for PlantId GET request
    config.method = "get";
    config.url = `https://plant.id/api/v3/identification/${access_token}?details=common_names,url,description,taxonomy,rank,gbif_id,inaturalist_id,image,synonyms,edible_parts,watering&language=en`;
    config.data = null; // Clear out data as it is not needed for GET

    // GET request to retrieve analysis result
    const getResponse = await axios(config);
    apiResponse = getResponse.data;
    // console.log(
    //   ">>> 22. Successful GET req to PlantID-info",
    //   JSON.stringify(getResponse.data)
    // );
  } catch (error) {
    console.log("An error occurred during request to PlantID API");
    console.error(error);
    return {
      error: "An error occurred during request to PlantID API",
      details: error.message,
    };
  }

  // Final analysis result
  // console.log(">>> 9999. Final PlantID analysisResult: ", apiResponse);
  const result = apiResponse.result.classification;
  return result;
};

// Chat Follow-Up Endpoint
app.post("/chat/follow-up", async (req, res) => {
  const {
    initialAnalysis, // The previous analysis result we want to reference
    model, // 'qwen' or 'llama' to maintain consistency with the same model
    message, // User's follow-up question
    conversationId, // To maintain chat history (not stored currently) but we should in the future,
  } = req.body;

  if (!initialAnalysis || !model || !message) {
    console.log(
      ">>>>> ERROR: Missing required parameters: initialAnalysis, model, or message."
    );
    return res.status(400).json({
      error: "Missing required parameters: initialAnalysis, model, or message",
    });
  }

  console.log(">>>> 11. model: ", model);
  console.log(">>>> 22. messages: ", message);

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

    console.log("response.data: ", response.data.choices[0].message);

    // Respond directly without storing conversation history, we should change this in the future
    res.status(200).json({
      message: "Follow-up response generated",
      response: response.data.choices[0].message.content,
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
