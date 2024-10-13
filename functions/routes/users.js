const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/", (req, res) => {
  res.send("User List");
});
router.get("/new", (req, res) => {
  res.send("User New List");
});
router.get("/new/:id", (req, res) => {
  res.send(`User New List with id: ${req.params.id}`);
});
router.post("/new", (req, res) => {
  res.send("Post New User");
});

module.exports = router;
