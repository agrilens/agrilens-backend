const admin = require("firebase-admin");

const serviceAccountObj = require("./serviceAccountKeys");

// Initialize Firebase Admin SDK with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountObj),
});

const db = admin.firestore();

module.exports = { admin, db };
