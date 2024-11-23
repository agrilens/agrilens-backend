const { admin, db } = require("../config/firebase-config");

const uploadFollowUpToFirebase = async (
  userID,
  chatId,
  sender,
  message,
  initialAnalysisSummary = ""
) => {
  try {
    // Reference to the chat-history collection
    // console.log("userID: ", userID);
    const docId = chatId.toString();
    const customerId = userID ? userID : "OQ79MAoXE9SMin2WhUzNV5vyTm73"; // Ensure to replace this with actual customer ID
    const historyRef = db
      .collection("users")
      .doc("customers")
      .collection("customer")
      .doc(customerId)
      .collection("chat-history")
      .doc(docId);

    // Prepare the chat data to be added
    const chatData = {
      sender,
      message,
      direction: sender === "user" ? "outgoing" : "incoming",
      timestamp: Date.now().toString(),
    };

    // console.log("initialAnalysisSummary: ", initialAnalysisSummary);

    // Fetch the existing chat document
    const docSnapshot = await historyRef.get();

    if (docSnapshot.exists) {
      const chatDataFromDb = docSnapshot.data();
      const currentConversations = chatDataFromDb?.conversations || [];

      // Push the new chat message into the existing array
      currentConversations.push(chatData);

      // const arrayUnionResult = admin.firestore.FieldValue.arrayUnion(chatData);
      // await historyRef.update({
      //   initialAnalysisSummary: initialAnalysisSummary,
      //   conversations: arrayUnionResult,
      // });

      // Update the Firestore document with the new array
      await historyRef.update({
        initialAnalysisSummary,
        conversations: currentConversations,
      });

      // console.log(">>>> Chat entry added to customer's db! docId: ", docId);
    } else {
      // console.log("No existing chat document found, creating a new one.");
      // If the document doesn't exist, create a new one with the chat data
      await historyRef.set({
        initialAnalysisSummary,
        conversations: [chatData],
      });

      // console.log(">>>> 400. New chat document created successfully!");
    }
  } catch (error) {
    console.error("Error adding chat entry:", error);
  }
};

module.exports = uploadFollowUpToFirebase;
