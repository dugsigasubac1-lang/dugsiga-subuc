import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DatabaseState } from './types';

const firebaseConfig = {
  projectId: "amplified-watch-0nzsc",
  appId: "1:99307980290:web:5d196cf5895badaba1c91b",
  apiKey: "AIzaSyAXPwLDOK00wQdzAvjDTtzbnk_sUHug6J8",
  authDomain: "amplified-watch-0nzsc.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-4ff514b8-ec83-4143-b156-7acce5ac27d5",
  storageBucket: "amplified-watch-0nzsc.firebasestorage.app",
  messagingSenderId: "99307980290"
};

let app: any = null;
let db: any = null;
let stateDocRef: any = null;
let initialized = false;

export function isDirectFirebasePreferred(): boolean {
  const host = window.location.hostname;
  // If we are browsing on Netlify/Custom public domains, prefer direct Firebase to avoid CORS/302 redirects
  return (
    host.includes('dugsigasubuc.com') ||
    host.includes('netlify.app') ||
    host.includes('vercel.app')
  );
}

export function initFirebaseClient() {
  if (initialized) return { db, stateDocRef };
  try {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    stateDocRef = doc(db, 'system', 'state');
    initialized = true;
    console.info(`[Dugsiga Subuc] Connected directly to Firestore database: "${firebaseConfig.firestoreDatabaseId}"`);
  } catch (error) {
    console.error('[Dugsiga Subuc] Failed to initialize direct Firebase Client:', error);
  }
  return { db, stateDocRef };
}

export async function fetchRemoteDatabaseState(): Promise<DatabaseState | null> {
  const { stateDocRef } = initFirebaseClient();
  if (!stateDocRef) return null;
  try {
    const snap = await getDoc(stateDocRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      return data?.state || null;
    }
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore fetch error:', error);
  }
  return null;
}

export async function saveRemoteDatabaseState(state: DatabaseState): Promise<boolean> {
  const { stateDocRef } = initFirebaseClient();
  if (!stateDocRef) return false;
  try {
    await setDoc(stateDocRef, { state });
    return true;
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore save error:', error);
    return false;
  }
}

export function subscribeToRemoteDatabaseState(onUpdate: (state: DatabaseState) => void): () => void {
  const { stateDocRef } = initFirebaseClient();
  if (!stateDocRef) return () => {};
  try {
    return onSnapshot(stateDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data?.state) {
          onUpdate(data.state);
        }
      }
    }, (error) => {
      console.error('[Dugsiga Subuc] Direct Firestore sync listener error:', error);
    });
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore subscription failed:', error);
    return () => {};
  }
}
