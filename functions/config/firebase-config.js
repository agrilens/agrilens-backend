const admin = require("firebase-admin");

const serviceAccountObj = require("./serviceAccountKeys");
// const serviceAccountObj = require("./serviceAccountKeys.json");

// console.log("Service account keys:", Object.keys(serviceAccountObj));
// console.log("private_key :", serviceAccountObj.private_key);

// Initialize Firebase Admin SDK with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountObj),
  databaseURL: "https://agrilens-web.firebaseio.com", // Ensure this matches your Firestore database URL
});

const db = admin.firestore();

module.exports = { admin, db };
