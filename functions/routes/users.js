const express = require("express");
// eslint-disable-next-line new-cap
const { db, admin } = require("../config/firebase-config.js");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("User List");
});

router.get("/all", async (req, res) => {
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

router.get("/:customerId/account/", async (req, res) => {
  const { customerId } = req.params; // Extract customer ID and account ID from URL parameters

  try {
    // Reference to the specific account document
    const accountRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("account")
      .doc("detail");

    // Get the account document
    const accountDoc = await accountRef.get();

    // Check if the account document exists
    if (!accountDoc.exists) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Access the account data
    const accountData = accountDoc.data();

    // Respond with the account data
    res.status(200).json({
      message: "Account data retrieved successfully!",
      account: accountData,
    });
  } catch (error) {
    console.error("Error fetching account data:", error);
    res
      .status(500)
      .json({ message: "Error fetching account data.", error: error.message });
  }
});

router.get("/:customerId/chat-history/", async (req, res) => {
  const { customerId } = req.params;

  // console.log("88. customerId: ", customerId);
  try {
    // Reference to the specific scan hitory
    const historyRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("chat-history")
      .orderBy("timestamp", "desc");

    const snapshot = await historyRef.get();

    const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // console.log("91. scans: ", chats);

    res.status(200).json({
      message: "Scan history retrieved successfully!",
      chats,
    });
  } catch (error) {
    console.error("Error fetching scan history:", error);
    res
      .status(500)
      .json({ message: "Error fetching scan history.", error: error.message });
  }
});

router.get("/scan-history", async (req, res) => {
  const customerId = req.headers["userid"]; // Extract customer ID from request header.

  // console.log("66. customerId: ", customerId);
  try {
    // Reference to the specific scan hitory
    const historyRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("scan-history")
      .orderBy("timestamp", "desc");

    // console.log("67. historyRef: ", historyRef);

    // Get the scan-history collection
    const snapshot = await historyRef.get();
    // console.log("68. snapshot: ", snapshot);

    const scans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // console.log("69. scans: ", scans);

    // Respond with the accounts
    res.status(200).json({
      message: "Scan history retrieved successfully!",
      scans,
    });
  } catch (error) {
    console.error("Error fetching scan history:", error);
    res
      .status(500)
      .json({ message: "Error fetching scan history.", error: error.message });
  }
});

// /////////////////////////////////

// Create a new user:
router.post("/customer", async (req, res) => {
  const {
    firstName,
    lastName,
    type,
    email,
    city,
    state,
    country,
    userInterest,
    uid,
  } = req.body; // Expect these fields in the request body

  if (!firstName || !email || !uid) {
    return res.status(400).json({ message: "Enter Required Fields." });
  }

  try {
    const customersRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(uid);

    await customersRef.set({
      createdAt: new Date().toISOString(),
    });

    const accountDetailRef = customersRef.collection("account").doc("detail");

    await accountDetailRef.set(
      Object.fromEntries(
        Object.entries({
          firstName,
          lastName,
          type,
          email,
          city,
          state,
          country,
          userInterest,
          uid,
          createdAt: new Date().toISOString(),
        }).filter(([_, value]) => value !== undefined) // Remove keys with undefined values
      )
    );

    res.status(201).json({
      message: "Customer created successfully!",
      customerId: uid,
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res
      .status(500)
      .json({ message: "Error creating customer.", error: error.message });
  }
});

// Route to add a new entry for a specific customer
router.post("/:customerId/chat-history", async (req, res) => {
  const { customerId } = req.params;
  const { message, sender } = req.body; // Expect message and timestamp in the request body

  console.log("message: ", message);
  try {
    const docId = Date.now().toString();
    // Reference to the chat-history collection
    const historyRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("chat-history")
      .doc(docId);

    // Set the chat data
    await historyRef.set({ message, sender, timestamp: docId });

    res
      .status(201)
      .json({ message: "Chat entry added successfully!", id: docId });
  } catch (error) {
    console.error("Error adding chat entry:", error);
    res
      .status(500)
      .json({ message: "Error adding chat entry.", error: error.message });
  }
});

router.post("/:customerId/scan-history", async (req, res) => {
  const { customerId } = req.params;
  const { imageUrl, imageData } = req.body;

  console.log("message: ", imageUrl);
  console.log("message: ", imageData);
  try {
    const docId = Date.now().toString();
    // Reference to the chat-history collection
    const historyRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("scan-history")
      .doc(docId);

    // Set the chat data
    await historyRef.set({ imageUrl, imageData, timestamp: docId });

    res
      .status(201)
      .json({ message: "Image entry added successfully!", id: docId });
  } catch (error) {
    console.error("Error adding image entry:", error);
    res
      .status(500)
      .json({ message: "Error adding image entry.", error: error.message });
  }
});

// Route to update account details for a specific customer
router.put("/:customerId/account", async (req, res) => {
  const { customerId } = req.params;
  const accountData = req?.body; // Expect account data in the request body
  console.log(">>> customerId: ", customerId);
  console.log(">>> accountData: ", accountData);

  try {
    // Reference to the specific account document
    const accountRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("account")
      .doc("detail");

    // Set the account data to Firestore (this will create or update the document)
    await accountRef.set(accountData, { merge: true }); // Using merge to preserve existing fields

    res.status(201).json({ message: "Account details saved successfully!" });
  } catch (error) {
    console.error("Error saving account data:", error);
    res
      .status(500)
      .json({ message: "Error saving account data.", error: error.message });
  }
});

router.put("/save-evaluation", async (req, res) => {
  const customerId = req.headers["userid"];
  const { scanId, evaluation } = req.body;

  // Validate required fields
  if (!customerId || !scanId || !evaluation) {
    console.error("Missing required fields:", {
      customerId,
      scanId,
      evaluation,
    });
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const docId = scanId.toString(); //
    // console.log("Firestore Path:", `users/customers/customer/${customerId}/scan-history/${docId}`);

    // Firestore document reference
    const accountRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("scan-history")
      .doc(docId);

    // Set the data with merge option
    await accountRef.set({ selectedEvaluation: evaluation }, { merge: true });
    console.log("Evaluation saved successfully for doc:", docId);

    res.status(201).json({ message: "Evaluation saved successfully!" });
  } catch (error) {
    console.error("Error saving evaluation data:", error);
    res.status(500).json({
      message: "Error saving evaluation data.",
      error: error.message,
    });
  }
});

module.exports = router;
