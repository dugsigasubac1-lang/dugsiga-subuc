import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc, setDoc, writeBatch, onSnapshot } from 'firebase/firestore';
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
    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true
      }, firebaseConfig.firestoreDatabaseId);
    } catch {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
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
  if (obj === undefined) {
    return null;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
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
        adminSessionId: coreData.adminSessionId,
        adminAllowedSessionId: coreData.adminAllowedSessionId,
        adminRevokeTime: coreData.adminRevokeTime,
        lastUpdatedTime: coreData.lastUpdatedTime || Date.now(),
        lastBackupDownloadDate: coreData.lastBackupDownloadDate,

        progress: progData.progress || [],

        billing: finData.billing || [],
        invoices: finData.invoices || [],
        moneyTransfers: finData.moneyTransfers || [],
        xawaaladaAccounts: finData.xawaaladaAccounts || [],
        xawaaladaTransactions: finData.xawaaladaTransactions || [],
        xawaaladaSettings: finData.xawaaladaSettings || null,

        submissions: logsData.submissions || [],
        teacherAttendance: logsData.teacherAttendance || [],
        notifications: logsData.notifications || [],
        exams: logsData.exams || []
      };

      return assembledState;
    }

    // 2. Fallback to monolithic system/state document if partitions don't exist yet
    if (stateDocRef) {
      const snap = await getDoc(stateDocRef).catch(() => null);
      if (snap && snap.exists()) {
        const data = snap.data() as any;
        return data?.state || null;
      }
    }
  } catch (error) {
    console.warn('[Dugsiga Subuc] Remote Firestore currently unavailable, utilizing local/server offline cache:', error);
    return null;
  }
  return null;
}

// Queue and Mutex for serializing Firestore writes to prevent write stream buffer exhaustion
let isWriteInProgress = false;
let pendingSave: {
  state: DatabaseState;
  options?: {
    userRole?: 'admin' | 'teacher' | null;
    explicitDeletedStudentIds?: string[];
    explicitDeletedTeacherIds?: string[];
    explicitDeletedExamIds?: string[];
    explicitDeletedInvoiceIds?: string[];
  };
  resolve: (val: boolean) => void;
  reject: (err: any) => void;
} | null = null;
let saveDebounceTimeout: any = null;

export async function saveRemoteDatabaseState(
  state: DatabaseState,
  options?: {
    userRole?: 'admin' | 'teacher' | null;
    explicitDeletedStudentIds?: string[];
    explicitDeletedTeacherIds?: string[];
    explicitDeletedExamIds?: string[];
    explicitDeletedInvoiceIds?: string[];
  }
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    // If a pending save is already queued, coalesce/merge with the latest request
    if (pendingSave) {
      const mergedPendingState = safeMergeDatabaseStates(pendingSave.state, state, { preferIncomingMeta: true });
      const mergedDeletedStudentIds = Array.from(new Set([
        ...(pendingSave.options?.explicitDeletedStudentIds || []),
        ...(options?.explicitDeletedStudentIds || [])
      ]));
      const mergedDeletedTeacherIds = Array.from(new Set([
        ...(pendingSave.options?.explicitDeletedTeacherIds || []),
        ...(options?.explicitDeletedTeacherIds || [])
      ]));
      const mergedDeletedExamIds = Array.from(new Set([
        ...(pendingSave.options?.explicitDeletedExamIds || []),
        ...(options?.explicitDeletedExamIds || [])
      ]));
      const mergedDeletedInvoiceIds = Array.from(new Set([
        ...(pendingSave.options?.explicitDeletedInvoiceIds || []),
        ...(options?.explicitDeletedInvoiceIds || [])
      ]));

      const previousResolve = pendingSave.resolve;
      pendingSave = {
        state: mergedPendingState,
        options: {
          ...pendingSave.options,
          ...options,
          explicitDeletedStudentIds: mergedDeletedStudentIds,
          explicitDeletedTeacherIds: mergedDeletedTeacherIds,
          explicitDeletedExamIds: mergedDeletedExamIds,
          explicitDeletedInvoiceIds: mergedDeletedInvoiceIds
        },
        resolve: (val: boolean) => {
          previousResolve(val);
          resolve(val);
        },
        reject
      };
      return;
    }

    pendingSave = { state, options, resolve, reject };

    if (!isWriteInProgress) {
      if (saveDebounceTimeout) clearTimeout(saveDebounceTimeout);
      saveDebounceTimeout = setTimeout(() => {
        processSaveQueue();
      }, 350);
    }
  });
}

async function processSaveQueue() {
  if (isWriteInProgress || !pendingSave) return;

  isWriteInProgress = true;
  const currentJob = pendingSave;
  pendingSave = null;

  try {
    const success = await executeDirectFirestoreSave(currentJob.state, currentJob.options);
    currentJob.resolve(success);
  } catch (err) {
    console.warn('[Dugsiga Subuc] Firestore queued save warning:', err);
    currentJob.resolve(false);
  } finally {
    isWriteInProgress = false;
    // If another save arrived while writing, process next after a quiet pause
    if (pendingSave) {
      setTimeout(() => {
        processSaveQueue();
      }, 400);
    }
  }
}

async function safeBatchCommitWithBackoff(batch: any, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await batch.commit();
      return;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if ((errMsg.includes('resource-exhausted') || errMsg.includes('RESOURCE_EXHAUSTED')) && attempt < retries) {
        console.warn(`[Firestore] Write stream busy, backing off (attempt ${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function executeDirectFirestoreSave(
  state: DatabaseState,
  options?: {
    userRole?: 'admin' | 'teacher' | null;
    explicitDeletedStudentIds?: string[];
    explicitDeletedTeacherIds?: string[];
    explicitDeletedExamIds?: string[];
    explicitDeletedInvoiceIds?: string[];
  }
): Promise<boolean> {
  const { db, coreDocRef, progressDocRef, financeDocRef, logsDocRef } = initFirebaseClient();
  if (!db || !coreDocRef) return false;

  try {
    const isTeacher = options?.userRole === 'teacher';
    const clean = removeUndefined(state);

    const batch = writeBatch(db);

    // 1. Progress partition
    if (progressDocRef) {
      const progressData = {
        progress: clean.progress || []
      };
      batch.set(progressDocRef, removeUndefined(progressData));
    }

    // 2. Logs partition (teacher attendance, submissions, exams, notifications)
    if (logsDocRef) {
      const logsData = {
        submissions: clean.submissions || [],
        teacherAttendance: clean.teacherAttendance || [],
        notifications: clean.notifications || [],
        exams: clean.exams || []
      };
      batch.set(logsDocRef, removeUndefined(logsData));
    }

    // 3. Admin-only partitions: Core Roster & Finance
    if (!isTeacher) {
      if (coreDocRef) {
        const coreData = {
          teachers: clean.teachers || [],
          students: clean.students || [],
          classes: clean.classes || [],
          schoolLocation: clean.schoolLocation || null,
          landingPageSettings: clean.landingPageSettings || null,
          contactMessages: clean.contactMessages || [],
          adminSessionId: clean.adminSessionId || null,
          adminAllowedSessionId: clean.adminAllowedSessionId || null,
          adminRevokeTime: clean.adminRevokeTime || null,
          lastUpdatedTime: clean.lastUpdatedTime || Date.now(),
          lastBackupDownloadDate: clean.lastBackupDownloadDate || null
        };
        batch.set(coreDocRef, removeUndefined(coreData));
      }

      if (financeDocRef) {
        const financeData = {
          billing: clean.billing || [],
          invoices: clean.invoices || [],
          moneyTransfers: clean.moneyTransfers || [],
          xawaaladaAccounts: clean.xawaaladaAccounts || [],
          xawaaladaTransactions: clean.xawaaladaTransactions || [],
          xawaaladaSettings: clean.xawaaladaSettings || null
        };
        batch.set(financeDocRef, removeUndefined(financeData));
      }
    }

    // Single atomic commit for all partitions!
    await safeBatchCommitWithBackoff(batch);
    return true;
  } catch (error) {
    console.error('[Dugsiga Subuc] Direct Firestore save error:', error);
    return false;
  }
}

export function subscribeToRemoteDatabaseState(
  onUpdate: (state: DatabaseState) => void,
  initialState?: DatabaseState | null
): () => void {
  const { coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
  if (!coreDocRef && !stateDocRef) return () => {};

  // Initialize partitions from initial state or local database so no partition is ever empty/undefined
  const fallback = initialState || null;
  let latestCore: any = fallback ? {
    teachers: fallback.teachers || [],
    students: fallback.students || [],
    classes: fallback.classes || [],
    schoolLocation: fallback.schoolLocation || null,
    landingPageSettings: fallback.landingPageSettings || null,
    contactMessages: fallback.contactMessages || [],
    adminAllowedSessionId: fallback.adminAllowedSessionId,
    adminRevokeTime: fallback.adminRevokeTime,
    lastUpdatedTime: fallback.lastUpdatedTime || Date.now(),
    lastBackupDownloadDate: fallback.lastBackupDownloadDate || null,
  } : null;

  let latestProg: any = fallback ? {
    progress: fallback.progress || []
  } : null;

  let latestFin: any = fallback ? {
    billing: fallback.billing || [],
    invoices: fallback.invoices || [],
    moneyTransfers: fallback.moneyTransfers || [],
    xawaaladaAccounts: fallback.xawaaladaAccounts || [],
    xawaaladaTransactions: fallback.xawaaladaTransactions || [],
    xawaaladaSettings: fallback.xawaaladaSettings || null,
  } : null;

  let latestLogs: any = fallback ? {
    submissions: fallback.submissions || [],
    teacherAttendance: fallback.teacherAttendance || [],
    notifications: fallback.notifications || [],
    exams: fallback.exams || []
  } : null;

  let debounceTimer: any = null;

  const emitLiveState = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!latestCore && !latestProg && !latestFin && !latestLogs) return;

      const assembled: DatabaseState = {
        teachers: latestCore?.teachers || fallback?.teachers || [],
        students: latestCore?.students || fallback?.students || [],
        classes: latestCore?.classes || fallback?.classes || [],
        schoolLocation: latestCore?.schoolLocation || fallback?.schoolLocation || null,
        landingPageSettings: latestCore?.landingPageSettings || fallback?.landingPageSettings || null,
        contactMessages: latestCore?.contactMessages || fallback?.contactMessages || [],
        adminAllowedSessionId: latestCore?.adminAllowedSessionId || fallback?.adminAllowedSessionId,
        adminRevokeTime: latestCore?.adminRevokeTime || fallback?.adminRevokeTime,
        lastUpdatedTime: latestCore?.lastUpdatedTime || fallback?.lastUpdatedTime || Date.now(),
        lastBackupDownloadDate: latestCore?.lastBackupDownloadDate || fallback?.lastBackupDownloadDate || null,

        progress: latestProg?.progress || fallback?.progress || [],

        billing: latestFin?.billing || fallback?.billing || [],
        invoices: latestFin?.invoices || fallback?.invoices || [],
        moneyTransfers: latestFin?.moneyTransfers || fallback?.moneyTransfers || [],
        xawaaladaAccounts: latestFin?.xawaaladaAccounts || fallback?.xawaaladaAccounts || [],
        xawaaladaTransactions: latestFin?.xawaaladaTransactions || fallback?.xawaaladaTransactions || [],
        xawaaladaSettings: latestFin?.xawaaladaSettings || fallback?.xawaaladaSettings || null,

        submissions: latestLogs?.submissions || fallback?.submissions || [],
        teacherAttendance: latestLogs?.teacherAttendance || fallback?.teacherAttendance || [],
        notifications: latestLogs?.notifications || fallback?.notifications || [],
        exams: latestLogs?.exams || fallback?.exams || []
      };

      onUpdate(assembled);
    }, 150);
  };

  // Seed initial values in parallel so live state is ready immediately
  Promise.all([
    coreDocRef ? getDoc(coreDocRef).catch(() => null) : null,
    progressDocRef ? getDoc(progressDocRef).catch(() => null) : null,
    financeDocRef ? getDoc(financeDocRef).catch(() => null) : null,
    logsDocRef ? getDoc(logsDocRef).catch(() => null) : null
  ]).then(([coreSnap, progSnap, finSnap, logsSnap]) => {
    if (coreSnap && coreSnap.exists()) latestCore = coreSnap.data();
    if (progSnap && progSnap.exists()) latestProg = progSnap.data();
    if (finSnap && finSnap.exists()) latestFin = finSnap.data();
    if (logsSnap && logsSnap.exists()) latestLogs = logsSnap.data();
    emitLiveState();
  }).catch(() => {});

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

