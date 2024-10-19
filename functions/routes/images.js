const multer = require("multer");
const axios = require("axios");
const express = require("express");
const { db, admin } = require("../config/firebase-config.js");
const { decodeToken } = require("../middleware");
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

module.exports = router;
