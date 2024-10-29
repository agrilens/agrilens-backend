const axios = require("axios");
const express = require("express");
const { db, admin } = require("../../config/firebase-config.js");
// const { decodeToken } = require("../../middleware");
const router = express.Router();

router.get("/", (req, res) => {
  if (db) {
    console.log(">>>>> Firestore has been initialized successfully!");
  } else {
    console.error(">>>>> Firestore initialization failed.");
  }
  res.send("Firebase DB testing");
});

router.get("/guests", async (req, res) => {
  try {
    const collections = await db.listCollections();
    const collectionNames = collections.map((col) => col.id);

    res.status(200).json({
      message: "Connected to Firestore!",
      collections: collectionNames,
    });
  } catch (error) {
    res.status(500).send(">>>> Firestore connection error: " + error.message);
  }
});

router.get("/customers", async (req, res) => {
  try {
    const customersRef = db
      .collection("users")
      .doc("customers")
      .collection("customer");

    const snapshot = await customersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No customers found." });
    }

    const customers = snapshot.docs.map((doc) => ({
      id: doc.id, // Extract the document ID
      ...doc.data(), // Spread the document data
    }));

    console.log("customers: ", customers);

    res.status(200).json({
      message: "Customers retrieved successfully!",
      customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      message: "Error fetching customers.",
      error: error.message,
    });
  }
});

router.get("/connection-test", async (req, res) => {
  try {
    if (db) {
      console.log(">>>>> 33. Firestore has been initialized successfully!");
    } else {
      console.error(">>>>> 33. Firestore initialization failed.");
    }
    const collections = await db.listCollections();
    const collectionNames = collections.map((col) => col.id);

    // console.log(">>>> collections: ", collections);

    res.status(200).json({
      message: "Connected to Firestore!",
      collections: collectionNames,
    });
  } catch (error) {
    res.status(500).send(">>>> Firestore connection error: " + error.message);
  }
});

router.post("/createdb", async (req, res) => {
  try {
    const id = req.body.email;
    const userJson = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    };

    await db.collection("users").doc(id).set(userJson);

    res.status(200).json({
      message: "User created successfully",
      data: userJson,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
});

module.exports = router;
