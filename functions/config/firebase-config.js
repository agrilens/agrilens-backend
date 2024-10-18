const admin = require("firebase-admin");

const serviceAccountObj = require("./serviceAccountKeys");

console.log("Service account keys:", Object.keys(serviceAccountObj));
console.log("Project ID:", serviceAccountObj.project_id);

// Initialize Firebase Admin SDK with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountObj),
});

const db = admin.firestore();

module.exports = { admin, db };