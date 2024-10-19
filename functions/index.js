/* eslint-disable */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const busboy = require('busboy');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();
const upload = multer({ memory: true });

const middleware = require("./middleware");
const userRouter = require("./routes/users");
const imageRouter = require("./routes/images");
const plantApi = require("./routes/api/plants"); 

const app = express();
app.use(cors());
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send({ data: "AgriLens firebase functions" });
});

app.get("/filedownload", (req, res) => {
  res.download("index.js"); // Let's the user download the given file
});

app.get("/htmlrender", (req, res) => {
  res.render("index"); // Returns view/index.html file
});

app.use("/images", imageRouter);

//app.post("/analyze", (req, res) => {
//  if (req.method !== 'POST') {
//    return res.status(405).end();
//  }
//
//  const bb = busboy({ headers: req.headers });
//  let fileBuffer = null;
//
//  bb.on('file', (name, file, info) => {
//    const chunks = [];
//    file.on('data', (data) => {
//      chunks.push(data);
//    });
//    file.on('end', () => {
//      fileBuffer = Buffer.concat(chunks);
//      console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
//    });
//  });
//
//  bb.on('finish', async () => {
//    if (!fileBuffer) {
//      return res.status(400).json({ error: 'No file uploaded' });
//    }
//
//    try {
//      const base64Image = fileBuffer.toString('base64');
//
//      const apiResponse = await axios.post('https://api.hyperbolic.xyz/v1/chat/completions', {
//        model: 'Qwen/Qwen2-VL-72B-Instruct',
//        messages: [
//          { role: 'system', content: 'Analyze the given plant image for health issues.' },
//          { 
//            role: 'user', 
//            content: [
//              { type: "text", text: 'Analyze this plant image:'},
//              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
//            ]
//          }
//        ],
//        max_tokens: 2048,
//        temperature: 0.7,
//        top_p: 0.9,
//        stream: false
//      }, {
//        headers: {
//          'Content-Type': 'application/json',
//          'Authorization': `Bearer ${process.env.HYPERBOLIC_API_KEY}`
//        }
//      });
//
//      const analysisResult = apiResponse.data.choices[0].message.content;
//
//      res.status(200).json({ 
//        message: "Analysis completed",
//        result: analysisResult
//      });
//    } catch (error) {
//      console.error('Error:', error);
//      res.status(500).json({ error: 'An error occurred during analysis', details: error.message });
//    }
//  });
//
//  bb.end(req.rawBody);
//});

// app.post("/analyze", (req, res) => {
//   if (req.method !== 'POST') {
//     return res.status(405).end();
//   }
// 
//   const bb = busboy({ headers: req.headers });
//   let fileBuffer = null;
// 
//   bb.on('file', (name, file, info) => {
//     const chunks = [];
//     file.on('data', (data) => {
//       chunks.push(data);
//     });
//     file.on('end', () => {
//       fileBuffer = Buffer.concat(chunks);
//       console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
//     });
//   });
// 
//   bb.on('finish', async () => {
//     if (!fileBuffer) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }
// 
//     try {
//       const base64Image = fileBuffer.toString('base64');
// 
//       const apiResponse = await axios.post('https://api.hyperbolic.xyz/v1/chat/completions', {
//         model: 'Qwen/Qwen2-VL-72B-Instruct',
//         messages: [
//           { role: 'system', content: 'Analyze the given plant image for health issues.' },
//           { 
//             role: 'user', 
//             content: [
//               { type: "text", text: 'Analyze this plant image:'},
//               { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
//             ]
//           }
//         ],
//         max_tokens: 2048,
//         temperature: 0.7,
//         top_p: 0.9,
//         stream: false
//       }, {
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${process.env.HYPERBOLIC_API_KEY}`
//         }
//       });
// 
//       const analysisResult = apiResponse.data.choices[0].message.content;
// 
//       // Log to Firestore
//       const db = admin.firestore();
//       const docRef = await db.collection('analyses').add({
//         result: analysisResult,
//         timestamp: new Date()
//       });
// 
//       res.status(200).json({ 
//         message: "Analysis completed and logged",
//         id: docRef.id,
//         result: analysisResult
//       });
//     } catch (error) {
//       console.error('Error:', error);
//       res.status(500).json({ error: 'An error occurred during analysis', details: error.message });
//     }
//   });
// 
//   bb.end(req.rawBody);
// });

app.post("/analyze", (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const bb = busboy({ headers: req.headers });
  let fileBuffer = null;

  bb.on('file', (name, file, info) => {
    const chunks = [];
    file.on('data', (data) => {
      chunks.push(data);
    });
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
    });
  });

  bb.on('finish', async () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      console.log('Sending request to Hyperbolic API...');
      const base64Image = fileBuffer.toString('base64');

      const apiResponse = await axios.post('https://api.hyperbolic.xyz/v1/chat/completions', {
        model: 'Qwen/Qwen2-VL-72B-Instruct',
        messages: [
          { role: 'system', content: 'Analyze the given plant image for health issues.' },
          { 
            role: 'user', 
            content: [
              { type: "text", text: 'Analyze this plant image:'},
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HYPERBOLIC_API_KEY}`
        }
      });

      console.log('Received response from Hyperbolic API');
      const analysisResult = apiResponse.data.choices[0].message.content;

      // console.log('Logging to Firestore...');
      // const db = admin.firestore();
      // const docRef = await db.collection('analyses').add({
      //   result: analysisResult,
      //   timestamp: new Date() //admin.firestore.FieldValue.serverTimestamp()
      // });
      // console.log('Successfully logged to Firestore with ID:', docRef.id);

      res.status(200).json({ 
        message: "Analysis completed and logged",
        // id: docRef.id,
        result: analysisResult
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'An error occurred during analysis', details: error.message });
    }
  });

  bb.end(req.rawBody);
});

app.post("/upload", (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const bb = busboy({ headers: req.headers });
  let fileBuffer = null;

  bb.on('file', (name, file, info) => {
    const { filename, encoding, mimeType } = info;
    console.log(
      `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
      filename,
      encoding,
      mimeType
    );
    const chunks = [];
    file.on('data', (data) => {
      chunks.push(data);
    });
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      console.log(`File [${name}] Finished. Size: ${fileBuffer.length} bytes`);
    });
  });

  bb.on('field', (name, val, info) => {
    console.log(`Field [${name}]: value: %j`, val);
  });

  bb.on('finish', () => {
    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.status(200).json({ message: 'File uploaded successfully', size: fileBuffer.length });
  });

  bb.end(req.rawBody);
});

app.use(middleware.decodeToken);

app.get("/auth", (req, res) => {
  res.status(200).send({ data: "Authorized: AgriLens firebase functions" });
});

app.get("/auth/download", (req, res) => {
  res.download("index"); // Let's the user download the given file
});
app.get("/auth/htmlrender", (req, res) => {
  res.render("index"); // Returns view/index.html file
});

app.get("/api/plants", (req, res) => {
  console.log("req user: ", req.user);
  return res.json({
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

app.use("/users", userRouter);
app.use("/api/plants", plantApi);

exports.app = functions.https.onRequest(app);

// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
