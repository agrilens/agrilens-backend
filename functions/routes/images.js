const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();

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
