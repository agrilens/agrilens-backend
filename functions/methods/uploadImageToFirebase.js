const { db, bucket } = require("../config/firebase-config");

const uploadImageToFirebase = async (
  userID,
  scanId,
  fileBuffer,
  fileName,
  defaultEvaluation = []
) => {
  const file = bucket.file(`scanned-images/${fileName}`);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: "image/jpeg",
      },
    });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("finish", async () => {
      try {
        await file.makePublic();
        const publicUrl = file.publicUrl();

        // Save scanned image public URL on user's database.
        try {
          // const docId = Date.now().toString();
          const docId = scanId.toString();
          // Reference to the chat-history collection
          const customerId = userID ? userID : "OQ79MAoXE9SMin2WhUzNV5vyTm73";
          imageUrl = publicUrl;
          const historyRef = db
            .collection("users")
            .doc("customers")
            .collection("customer")
            .doc(customerId)
            .collection("scan-history")
            .doc(docId);

          // Set the chat data
          await historyRef.set({
            imageUrl,
            defaultEvaluation,
            timestamp: Date.now().toString(),
          });
        } catch (error) {
          console.error("Error: ", error);
        }

        resolve(publicUrl);
      } catch (err) {
        reject(err);
      }
    });

    stream.end(fileBuffer);
  });
};

module.exports = uploadImageToFirebase;
