importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// NOTE: these values are safe to expose publicly — they identify the
// Firebase project, they are not secret keys.
firebase.initializeApp({
  apiKey: "REEMPLAZAR_CON_TU_API_KEY",
  authDomain: "REEMPLAZAR.firebaseapp.com",
  projectId: "REEMPLAZAR",
  storageBucket: "REEMPLAZAR.appspot.com",
  messagingSenderId: "REEMPLAZAR",
  appId: "REEMPLAZAR",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "APPadel Buche Kuete", {
    body: body || "Hay una noticia nueva.",
    icon: "/icon-192.png",
  });
});
