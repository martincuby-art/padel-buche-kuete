"use client";

import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

// ---- Players ----
export function subscribePlayers(cb) {
  return onSnapshot(collection(db, "players"), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addPlayer(player) {
  const ref = await addDoc(collection(db, "players"), player);
  return ref.id;
}

export async function updatePlayer(id, data) {
  await updateDoc(doc(db, "players", id), data);
}

export async function deletePlayer(id) {
  await deleteDoc(doc(db, "players", id));
}

export async function addFcmToken(playerId, token) {
  await updateDoc(doc(db, "players", playerId), {
    fcmTokens: arrayUnion(token),
  });
}

// ---- Matches ----
export function subscribeMatches(cb) {
  const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addMatch(match) {
  const ref = await addDoc(collection(db, "matches"), match);
  return ref.id;
}

export async function updateMatch(id, data) {
  await updateDoc(doc(db, "matches", id), data);
}

export async function deleteMatch(id) {
  await deleteDoc(doc(db, "matches", id));
}

export async function deleteAllMatches() {
  const snap = await getDocs(collection(db, "matches"));
  const docs = snap.docs;
  // Firestore batches are capped at 500 writes; chunk just in case.
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ---- Tournaments (collection: one doc per tournament period) ----
export function subscribeTournaments(cb) {
  const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addTournament(data) {
  const ref = await addDoc(collection(db, "tournaments"), data);
  return ref.id;
}

export async function updateTournament(id, data) {
  await updateDoc(doc(db, "tournaments", id), data);
}

// ---- News ----
export function subscribeNews(cb) {
  const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addNews(item) {
  const ref = await addDoc(collection(db, "news"), item);
  return ref.id;
}

export async function deleteNews(id) {
  await deleteDoc(doc(db, "news", id));
}

export async function reactToNews(id, uid, reaction) {
  // reaction: "like" | "dislike" | null (null clears any existing reaction)
  const updates = {};
  if (reaction === "like") {
    updates.likedBy = arrayUnion(uid);
    updates.dislikedBy = arrayRemove(uid);
  } else if (reaction === "dislike") {
    updates.dislikedBy = arrayUnion(uid);
    updates.likedBy = arrayRemove(uid);
  } else {
    updates.likedBy = arrayRemove(uid);
    updates.dislikedBy = arrayRemove(uid);
  }
  await updateDoc(doc(db, "news", id), updates);
}

export async function recordNewsView(id, uid) {
  await updateDoc(doc(db, "news", id), { viewedBy: arrayUnion(uid) });
}
