/* eslint-disable */

const functions = require("firebase-functions");
// const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

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
app.use("/images", imageRouter);
app.use("/api/plants", plantApi);

exports.app = functions.https.onRequest(app);

// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
