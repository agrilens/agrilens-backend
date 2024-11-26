const admin = require("firebase-admin");
const serviceAccountObj = require("./serviceAccountKeys");
// const serviceAccountObj = require("./serviceAccountKeys.json");

// console.log("Service account keys:", Object.keys(serviceAccountObj));
// console.log("private_key :", serviceAccountObj.private_key);

// Initialize Firebase Admin SDK with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountObj),
  databaseURL: process.env.PROJECT_DATABASE_URL, // Firestore database URL
  storageBucket: process.env.PROJECT_BUCKET_NAME,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };

// storageBucket: serviceAccountObj.project_bucket_name,
