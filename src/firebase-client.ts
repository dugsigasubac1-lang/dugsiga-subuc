import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DatabaseState } from './types';
import { safeMergeDatabaseStates } from './db';
import appConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  projectId: appConfig.projectId || "dugsiga-subuc-291ad",
  appId: appConfig.appId || "1:910340654988:web:0b4ab67421e7f985b878a9",
  apiKey: appConfig.apiKey || "AIzaSyCQ7WhL8DXyIqNt3FZgAutpq7FB6ySi6jc",
  authDomain: appConfig.authDomain || "dugsiga-subuc-291ad.firebaseapp.com",
  firestoreDatabaseId: appConfig.firestoreDatabaseId || "(default)",
  storageBucket: appConfig.storageBucket || "dugsiga-subuc-291ad.firebasestorage.app",
  messagingSenderId: appConfig.messagingSenderId || "910340654988"
};

let app: any = null;
let db: any = null;
let stateDocRef: any = null;
let coreDocRef: any = null;
let progressDocRef: any = null;
let financeDocRef: any = null;
let logsDocRef: any = null;
let initialized = false;

export function isDirectFirebasePreferred(): boolean {
  return true;
}

export function initFirebaseClient() {
  if (initialized && db) {
    return { db, stateDocRef, coreDocRef, progressDocRef, financeDocRef, logsDocRef };
  }
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    stateDocRef = doc(db, 'system', 'state');
    coreDocRef = doc(db, 'system', 'core');
    progressDocRef = doc(db, 'system', 'progress');
    financeDocRef = doc(db, 'system', 'finance');
    logsDocRef = doc(db, 'system', 'logs');
    initialized = true;
    console.info(`[Dugsiga Subuc] Connected directly to Firestore database: "${firebaseConfig.firestoreDatabaseId}"`);
  } catch (error) {
    console.error('[Dugsiga Subuc] Failed to initialize direct Firebase Client:', error);
  }
  return { db, stateDocRef, coreDocRef, progressDocRef, financeDocRef, logsDocRef };
}

function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = removeUndefined(val);
    }
  }
  return cleaned;
}

export async function fetchRemoteDatabaseState(): Promise<DatabaseState | null> {
  const { coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
  if (!coreDocRef) return null;

  try {
    // 1. Try reading the partitioned documents in parallel (faster and stays within Firestore size limits)
    const [coreSnap, progSnap, finSnap, logsSnap] = await Promise.all([
      getDoc(coreDocRef).catch(() => null),
      getDoc(progressDocRef).catch(() => null),
      getDoc(financeDocRef).catch(() => null),
      getDoc(logsDocRef).catch(() => null)
    ]);

    if (coreSnap && coreSnap.exists()) {
      const coreData = coreSnap.data() as any;
      const progData = (progSnap && progSnap.exists()) ? (progSnap.data() as any) : {};
      const finData = (finSnap && finSnap.exists()) ? (finSnap.data() as any) : {};
      const logsData = (logsSnap && logsSnap.exists()) ? (logsSnap.data() as any) : {};

      const assembledState: DatabaseState = {
        teachers: coreData.teachers || [],
        students: coreData.students || [],
        classes: coreData.classes || [],
        schoolLocation: coreData.schoolLocation,
        landingPageSettings: coreData.landingPageSettings,
        contactMessages: coreData.contactMessages || [],
        lastUpdatedTime: coreData.lastUpdatedTime || Date.now(),
        lastBackupDownloadDate: coreData.lastBackupDownloadDate,

        progress: progData.progress || [],

        billing: finData.billing || [],
        invoices: finData.invoices || [],
        moneyTransfers: finData.moneyTransfers || [],
        xawaaladaAccounts: finData.xawaaladaAccounts || [],
        xawaaladaTransactions: finData.xawaaladaTransactions || [],

        submissions: logsData.submissions || [],
        teacherAttendance: logsData.teacherAttendance || [],
        notifications: logsData.notifications || [],
        exams: logsData.exams || []
      };

      return assembledState;
    }

    // 2. Fallback to monolithic system/state document if partitions don't exist yet
    if (stateDocRef) {
      const snap = await getDoc(stateDocRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        return data?.state || null;
      }
    }
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore fetch error:', error);
    throw error;
  }
  return null;
}

export async function saveRemoteDatabaseState(
  state: DatabaseState,
  options?: { userRole?: 'admin' | 'teacher' | null; explicitDeletedStudentIds?: string[] }
): Promise<boolean> {
  const { coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
  if (!coreDocRef) return false;

  try {
    const isTeacher = options?.userRole === 'teacher';
    const clean = removeUndefined(state);

    const writePromises: Promise<any>[] = [];

    // Always update progress partition (daily work, revisions, attendance)
    if (progressDocRef) {
      const progressData = {
        progress: clean.progress || []
      };
      writePromises.push(setDoc(progressDocRef, progressData));
    }

    // Always update logs partition (teacher attendance, submissions, exams, notifications)
    if (logsDocRef) {
      const logsData = {
        submissions: clean.submissions || [],
        teacherAttendance: clean.teacherAttendance || [],
        notifications: clean.notifications || [],
        exams: clean.exams || []
      };
      writePromises.push(setDoc(logsDocRef, logsData));
    }

    // CRITICAL: ONLY ADMIN CAN MODIFY CORE ROSTER & FINANCIAL PARTITIONS!
    // Teachers are NEVER allowed to write core or finance documents, preventing any possible student drops.
    if (!isTeacher) {
      if (coreDocRef) {
        // Pre-merge with latest core on Firestore to protect multi-device concurrency
        try {
          const liveCoreSnap = await getDoc(coreDocRef);
          if (liveCoreSnap && liveCoreSnap.exists()) {
            const liveCore = liveCoreSnap.data() as any;
            const tempMerged = safeMergeDatabaseStates(
              {
                teachers: liveCore.teachers || [],
                students: liveCore.students || [],
                classes: liveCore.classes || [],
                contactMessages: liveCore.contactMessages || [],
                schoolLocation: liveCore.schoolLocation,
                landingPageSettings: liveCore.landingPageSettings,
                adminAllowedSessionId: liveCore.adminAllowedSessionId,
                adminRevokeTime: liveCore.adminRevokeTime,
                progress: [],
                billing: []
              },
              state,
              {
                userRole: 'admin',
                explicitDeletedStudentIds: options?.explicitDeletedStudentIds,
                preferIncomingMeta: false
              }
            );
            clean.students = tempMerged.students || clean.students;
            clean.teachers = tempMerged.teachers || clean.teachers;
            clean.classes = tempMerged.classes || clean.classes;
          }
        } catch (mErr) {
          console.warn('[Firestore] Pre-save live core merge warning:', mErr);
        }

        const coreData = {
          teachers: clean.teachers || [],
          students: clean.students || [],
          classes: clean.classes || [],
          schoolLocation: clean.schoolLocation || null,
          landingPageSettings: clean.landingPageSettings || null,
          contactMessages: clean.contactMessages || [],
          adminAllowedSessionId: clean.adminAllowedSessionId || null,
          adminRevokeTime: clean.adminRevokeTime || null,
          lastUpdatedTime: clean.lastUpdatedTime || Date.now(),
          lastBackupDownloadDate: clean.lastBackupDownloadDate || null
        };
        writePromises.push(setDoc(coreDocRef, coreData));
      }

      if (financeDocRef) {
        // Pre-merge with latest finance on Firestore
        try {
          const liveFinSnap = await getDoc(financeDocRef);
          if (liveFinSnap && liveFinSnap.exists()) {
            const liveFin = liveFinSnap.data() as any;
            const tempFinMerged = safeMergeDatabaseStates(
              {
                teachers: [],
                students: [],
                progress: [],
                billing: liveFin.billing || [],
                invoices: liveFin.invoices || [],
                moneyTransfers: liveFin.moneyTransfers || [],
                xawaaladaAccounts: liveFin.xawaaladaAccounts || [],
                xawaaladaTransactions: liveFin.xawaaladaTransactions || []
              },
              state,
              { userRole: 'admin', preferIncomingMeta: false }
            );
            clean.billing = tempFinMerged.billing || clean.billing;
            clean.invoices = tempFinMerged.invoices || clean.invoices;
            clean.moneyTransfers = tempFinMerged.moneyTransfers || clean.moneyTransfers;
            clean.xawaaladaAccounts = tempFinMerged.xawaaladaAccounts || clean.xawaaladaAccounts;
            clean.xawaaladaTransactions = tempFinMerged.xawaaladaTransactions || clean.xawaaladaTransactions;
          }
        } catch (finErr) {
          console.warn('[Firestore] Pre-save live finance merge warning:', finErr);
        }

        const financeData = {
          billing: clean.billing || [],
          invoices: clean.invoices || [],
          moneyTransfers: clean.moneyTransfers || [],
          xawaaladaAccounts: clean.xawaaladaAccounts || [],
          xawaaladaTransactions: clean.xawaaladaTransactions || []
        };
        writePromises.push(setDoc(financeDocRef, financeData));
      }

      // Also update legacy single-doc if within size limit (with catch)
      if (stateDocRef) {
        writePromises.push(
          setDoc(stateDocRef, { state: clean }).catch(err => {
            console.warn('[Dugsiga Subuc] Legacy system/state write skipped (partitioned write active):', err?.message);
          })
        );
      }
    }

    await Promise.all(writePromises);
    return true;
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore save error:', error);
    throw error;
  }
}

export function subscribeToRemoteDatabaseState(onUpdate: (state: DatabaseState) => void): () => void {
  const { coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
  if (!coreDocRef && !stateDocRef) return () => {};

  let latestCore: any = null;
  let latestProg: any = null;
  let latestFin: any = null;
  let latestLogs: any = null;
  let debounceTimer: any = null;

  const emitLiveState = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!latestCore) return;
      const assembled: DatabaseState = {
        teachers: latestCore.teachers || [],
        students: latestCore.students || [],
        classes: latestCore.classes || [],
        schoolLocation: latestCore.schoolLocation || null,
        landingPageSettings: latestCore.landingPageSettings || null,
        contactMessages: latestCore.contactMessages || [],
        adminAllowedSessionId: latestCore.adminAllowedSessionId,
        adminRevokeTime: latestCore.adminRevokeTime,
        lastUpdatedTime: latestCore.lastUpdatedTime || Date.now(),
        lastBackupDownloadDate: latestCore.lastBackupDownloadDate || null,

        progress: latestProg?.progress || [],

        billing: latestFin?.billing || [],
        invoices: latestFin?.invoices || [],
        moneyTransfers: latestFin?.moneyTransfers || [],
        xawaaladaAccounts: latestFin?.xawaaladaAccounts || [],
        xawaaladaTransactions: latestFin?.xawaaladaTransactions || [],

        submissions: latestLogs?.submissions || [],
        teacherAttendance: latestLogs?.teacherAttendance || [],
        notifications: latestLogs?.notifications || [],
        exams: latestLogs?.exams || []
      };
      onUpdate(assembled);
    }, 60);
  };

  try {
    const unsubs: (() => void)[] = [];

    if (coreDocRef) {
      unsubs.push(
        onSnapshot(coreDocRef, (snap) => {
          if (snap.exists()) {
            latestCore = snap.data();
            emitLiveState();
          }
        }, (err) => console.warn('[Dugsiga Subuc] Core live listener warning:', err?.message))
      );
    }

    if (progressDocRef) {
      unsubs.push(
        onSnapshot(progressDocRef, (snap) => {
          if (snap.exists()) {
            latestProg = snap.data();
            emitLiveState();
          }
        }, (err) => console.warn('[Dugsiga Subuc] Progress live listener warning:', err?.message))
      );
    }

    if (financeDocRef) {
      unsubs.push(
        onSnapshot(financeDocRef, (snap) => {
          if (snap.exists()) {
            latestFin = snap.data();
            emitLiveState();
          }
        }, (err) => console.warn('[Dugsiga Subuc] Finance live listener warning:', err?.message))
      );
    }

    if (logsDocRef) {
      unsubs.push(
        onSnapshot(logsDocRef, (snap) => {
          if (snap.exists()) {
            latestLogs = snap.data();
            emitLiveState();
          }
        }, (err) => console.warn('[Dugsiga Subuc] Logs live listener warning:', err?.message))
      );
    }

    if (stateDocRef) {
      unsubs.push(
        onSnapshot(stateDocRef, (snap) => {
          if (snap.exists() && !latestCore) {
            const data = snap.data() as any;
            if (data?.state) {
              onUpdate(data.state);
            }
          }
        }, (err) => console.warn('[Dugsiga Subuc] Fallback state listener warning:', err?.message))
      );
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubs.forEach(fn => fn());
    };
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore subscription failed:', error);
    return () => {};
  }
}

