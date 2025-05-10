require("dotenv").config();
const admin = require("firebase-admin");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = getDatabase();
const usersRef = db.ref("detailuser/user");

usersRef.on("child_added", (userSnap) => {
  const receiverId = userSnap.key;
  const dmsRef = db.ref(`detailuser/user/${receiverId}/dms`);

  dmsRef.on("child_added", (dmSnap) => {
    const senderId = dmSnap.key;

    if (receiverId !== senderId) {
      const messagesRef = db.ref(`detailuser/user/${receiverId}/dms/${senderId}`);

      messagesRef.limitToLast(1).on("child_added", (msgSnap) => {
        const msg = msgSnap.val();
        if (!msg) return;

        // 🔑 Fetch the token from detailuser/user/{receiverId}/token
        const tokenRef = db.ref(`detailuser/user/${receiverId}/token`);
        tokenRef.once("value", (tokenSnap) => {
          const token = tokenSnap.val();
          if (!token) {
            console.warn(`⚠️ No token found for user ${receiverId}`);
            return;
          }

          const payload = {
            notification: {
              title: "New Message",
              body: msg.text || "You have a new message",
            },
            token: token,
          };

          admin
            .messaging()
            .send(payload)
            .then((res) => console.log(`✅ Notification sent: ${res}`))
            .catch((err) => console.error("❌ Error:", err));
        });
      });
    }
  });
});
