import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DatabaseState } from './types';

const firebaseConfig = {
  projectId: "dugsiga-subuc-291ad",
  appId: "1:910340654988:web:0b4ab67421e7f985b878a9",
  apiKey: "AIzaSyCQ7WhL8DXyIqNt3FZgAutpq7FB6ySi6jc",
  authDomain: "dugsiga-subuc-291ad.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "dugsiga-subuc-291ad.firebasestorage.app",
  messagingSenderId: "910340654988"
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
