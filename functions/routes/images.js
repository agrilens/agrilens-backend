// eslint-disable-next-line new-cap
const multer = require('multer');
const axios = require('axios');
const express = require("express");
const { db, admin } = require('../config/firebase-config.js');
const { decodeToken } = require('../middleware');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", (req, res) => {
  res.send("Image List");
});

router.get("/new", (req, res) => {
  res.send("New Image");
});

router.get("/new/:id", (req, res) => {
  res.send(`New Image with id: ${req.params.id}`);
});
router.post("/new", (req, res) => {
  res.send("Post New Image");
});

// Analyze
router.post("/analyze", decodeToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const base64Image = req.file.buffer.toString('base64');

    const apiResponse = await axios.post('https://api.hyperbolic.xyz/v1/chat/completions', {
      model: 'Qwen/Qwen2-VL-72B-Instruct',
      messages: [
        { role: 'system', content: 'Analyze the given plant image for health issues.' },
        { 
          role: 'user', 
          content: [
            { type: "text", text: 'Analyze this plant image:'},
            { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` } }
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
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });

    const analysisResult = apiResponse.data.choices[0].message.content;

    // Store in Firebase with user association
    const docRef = await db.collection('plantAnalyses').add({
      result: analysisResult,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid, // This comes from the decoded token
      userEmail: req.user.email // Optional: store the user's email if needed
    });

    res.json({ 
      message: "Analysis completed and stored",
      id: docRef.id,
      result: analysisResult
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred during analysis' });
  }
});

module.exports = router;