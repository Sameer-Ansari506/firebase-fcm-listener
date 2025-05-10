const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com", // Replace with your actual DB URL
});

const db = getDatabase();
const dmsRef = db.ref("detailuser");

dmsRef.on("child_added", (snapshot) => {
  const receiverId = snapshot.key;
  const dmsPath = db.ref(`detailuser/${receiverId}/dms`);

  dmsPath.on("child_added", (dmSnapshot) => {
    const senderId = dmSnapshot.key;

    // Only proceed if receiverId !== senderId
    if (receiverId !== senderId) {
      const messagesRef = db.ref(`detailuser/${receiverId}/dms/${senderId}`);

      messagesRef.limitToLast(1).on("child_added", (messageSnap) => {
        const message = messageSnap.val();

        if (!message || !message.token) return;

        const payload = {
          notification: {
            title: "New Message",
            body: message.text || "You received a new message",
          },
          token: message.token,
        };

        admin
          .messaging()
          .send(payload)
          .then((res) => console.log(`Notification sent to ${receiverId}:`, res))
          .catch((err) => console.error(`Error sending to ${receiverId}:`, err));
      });
    }
  });
});
