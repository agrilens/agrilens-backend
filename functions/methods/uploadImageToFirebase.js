const { db, bucket } = require("../config/firebase-config");

const uploadImageToFirebase = async (userID, scanId, fileBuffer, fileName) => {
  console.log(">>> uploadImageToFirebase() called");
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
          await historyRef.set({ imageUrl, timestamp: Date.now().toString() }); // Using merge to keeps existing images
          console.log(
            ">>>> 100. ImageUrl entry added successfully to customer's db! docId: ",
            docId
          );
          // console.log(">>>> 100. ImageUrl entry added successfully to customer's db!");
        } catch (error) {
          // console.error(">>>> 101. Error adding ImageUrl entry:", error);
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
