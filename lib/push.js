"use client";

import { app } from "./firebase";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { addFcmToken } from "./data";

export async function enablePushNotifications(playerId) {
  const supported = await isSupported().catch(() => false);
  if (!supported) return { ok: false, reason: "not-supported" };

  if (!("Notification" in window)) return { ok: false, reason: "not-supported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { ok: false, reason: "no-token" };
    await addFcmToken(playerId, token);
    return { ok: true };
  } catch (e) {
    console.error("push setup failed", e);
    return { ok: false, reason: "error" };
  }
}
