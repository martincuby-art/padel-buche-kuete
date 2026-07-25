const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

initializeApp();

exports.notifyNewNews = onDocumentCreated("news/{newsId}", async (event) => {
  const news = event.data.data();
  const db = getFirestore();

  const playersSnap = await db.collection("players").get();
  const tokens = [];
  playersSnap.forEach((doc) => {
    const tk = doc.data().fcmTokens || [];
    tokens.push(...tk);
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: `📰 ${news.title}`,
      body: news.body.length > 120 ? news.body.slice(0, 117) + "…" : news.body,
    },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);

  // Limpieza opcional: sacar tokens inválidos/expirados de cada jugador
  const invalidTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) invalidTokens.push(tokens[i]);
  });
  if (invalidTokens.length > 0) {
    const batch = db.batch();
    playersSnap.forEach((doc) => {
      const current = doc.data().fcmTokens || [];
      const cleaned = current.filter((t) => !invalidTokens.includes(t));
      if (cleaned.length !== current.length) {
        batch.update(doc.ref, { fcmTokens: cleaned });
      }
    });
    await batch.commit();
  }
});
