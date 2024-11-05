/* eslint-disable */

const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ memory: true });
require('dotenv').config();

// Firebase configuration (if applicable)
const { admin, db } = require('./config/firebase-config');

// Initialize Express app
const app = express();
app.use(cors());
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routers (if any)
const middleware = require('./middleware');
const userRouter = require('./routes/users');
const imageRouter = require('./routes/images');
const plantApi = require('./routes/api/plants');
const usersApi = require('./routes/api/db');

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).send({ data: 'AgriLens firebase functions' });
});

// Use routers
app.use('/users', userRouter);
app.use('/images', imageRouter);
app.use('/api/users', usersApi);
app.use('/api/plants', plantApi);

// Analyze endpoint
app.post('/analyze', upload.single('image'), async (req, res) => {
  console.log('analyze called');
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const base64Image = file.buffer.toString('base64');

    // Prepare requests to both APIs
    console.log('Sending requests to Hyperbolic and Plant ID APIs...');

    // Hyperbolic API request
    const hyperbolicRequest = axios.post(
      'https://api.hyperbolic.xyz/v1/chat/completions',
      {
        model: 'Qwen/Qwen2-VL-72B-Instruct',
        messages: [
          {
            role: 'system',
            content: You are an AI assistant specialized in plant health analysis. Analyze the given image and provide a structured response in the following object notation:
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
            Ensure all fields are filled out based on your analysis of the image.,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this plant image for health issues:',
              },
              {
                type: 'image_url',
                image_url: { url: data:image/jpeg;base64,${base64Image} },
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
          'Content-Type': 'application/json',
          Authorization: Bearer ${process.env.HYPERBOLIC_API_KEY},
        },
      }
    );

    // Prepare Plant ID API URL with query parameters
    const plantIdUrl = 'https://api.plant.id/v3/identification';
    const plantIdParams = new URLSearchParams();
    plantIdParams.append('disease_details', 'description,treatment');
    plantIdParams.append('plant_details', 'common_names,description');
    plantIdParams.append('plant_language', 'en');
    plantIdParams.append('disease_language', 'en');

    // Plant ID API request
    const plantIdRequest = axios.post(
      ${plantIdUrl}?${plantIdParams.toString()},
      {
        images: [base64Image],
        health: 'all', // Include both identification and health assessment
        //  We can include other params here
      },
      {
        headers: {
          'Api-Key': process.env.PLANT_ID_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    // Execute both requests concurrently
    const [hyperbolicResponse, plantIdResponse] = await Promise.all([
      hyperbolicRequest,
      plantIdRequest,
    ]);

    console.log('Received responses from both APIs');

    // Extract results
    const hyperbolicResult = hyperbolicResponse.data.choices[0].message.content;
    const plantIdResult = plantIdResponse.data;

    // Send combined response to the client
    res.status(200).json({
      message: 'Analysis completed',
      hyperbolicResult: hyperbolicResult,
      plantIdResult: plantIdResult,
    });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'An error occurred during analysis',
      details: error.response ? error.response.data : error.message,
    });
  }
});

// Endpoint to interact with Plant ID chatbot
app.post('/plantid/conversation/:access_token', async (req, res) => {
  try {
    const accessToken = req.params.access_token;
    const { question, prompt, temperature, app_name } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const data = {
      question,
      ...(prompt && { prompt }),
      ...(temperature && { temperature }),
      ...(app_name && { app_name }),
    };

    const response = await axios.post(
      https://plant.id/api/v3/identification/${accessToken}/conversation,
      data,
      {
        headers: {
          'Api-Key': process.env.PLANT_ID_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'An error occurred while interacting with the chatbot',
      details: error.response ? error.response.data : error.message,
    });
  }
});

// Endpoint to get chatbot conversation history
app.get('/plantid/conversation/:access_token', async (req, res) => {
  try {
    const accessToken = req.params.access_token;

    const response = await axios.get(
      https://plant.id/api/v3/identification/${accessToken}/conversation,
      {
        headers: {
          'Api-Key': process.env.PLANT_ID_API_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'An error occurred while fetching chatbot conversation',
      details: error.response ? error.response.data : error.message,
    });
  }
});

// Other routes (if any)
app.get('/*', (req, res) => {
  res.status(200).send({ data: 'Endpoint is not valid' });
});

// Export the app as a Firebase Cloud Function
exports.app = functions.https.onRequest(app);