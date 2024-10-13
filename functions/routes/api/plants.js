const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();

router.get("/", (req, res) => {
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

module.exports = router;
