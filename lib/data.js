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

// ---- Tournament (single config doc) ----
export function subscribeTournament(cb) {
  return onSnapshot(doc(db, "config", "tournament"), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export async function setTournament(data) {
  await setDoc(doc(db, "config", "tournament"), data);
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
