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
  options?: {
    userRole?: 'admin' | 'teacher' | null;
    explicitDeletedStudentIds?: string[];
    explicitDeletedTeacherIds?: string[];
    explicitDeletedExamIds?: string[];
    explicitDeletedInvoiceIds?: string[];
  }
): Promise<boolean> {
  const { coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
  if (!coreDocRef) return false;

  try {
    const isTeacher = options?.userRole === 'teacher';
    const clean = removeUndefined(state);

    const writePromises: Promise<any>[] = [];

    // Pre-merge with latest progress partition
    if (progressDocRef) {
      try {
        const liveProgSnap = await getDoc(progressDocRef);
        if (liveProgSnap && liveProgSnap.exists()) {
          const liveProg = liveProgSnap.data() as any;
          const tempProgMerged = safeMergeDatabaseStates(
            {
              teachers: [],
              students: [],
              progress: liveProg.progress || [],
              billing: []
            },
            state,
            { userRole: isTeacher ? 'teacher' : 'admin', preferIncomingMeta: true }
          );
          clean.progress = tempProgMerged.progress || clean.progress;
        }
      } catch (pErr) {
        console.warn('[Firestore] Pre-save live progress merge warning:', pErr);
      }

      const progressData = {
        progress: clean.progress || []
      };
      writePromises.push(setDoc(progressDocRef, progressData));
    }

    // Pre-merge with latest logs partition (teacher attendance, submissions, exams, notifications)
    if (logsDocRef) {
      try {
        const liveLogsSnap = await getDoc(logsDocRef);
        if (liveLogsSnap && liveLogsSnap.exists()) {
          const liveLogs = liveLogsSnap.data() as any;
          const tempLogsMerged = safeMergeDatabaseStates(
            {
              teachers: [],
              students: [],
              progress: [],
              billing: [],
              submissions: liveLogs.submissions || [],
              teacherAttendance: liveLogs.teacherAttendance || [],
              notifications: liveLogs.notifications || [],
              exams: liveLogs.exams || []
            },
            state,
            {
              userRole: isTeacher ? 'teacher' : 'admin',
              explicitDeletedExamIds: options?.explicitDeletedExamIds,
              preferIncomingMeta: true
            }
          );
          clean.submissions = tempLogsMerged.submissions || clean.submissions;
          clean.teacherAttendance = tempLogsMerged.teacherAttendance || clean.teacherAttendance;
          clean.notifications = tempLogsMerged.notifications || clean.notifications;
          clean.exams = tempLogsMerged.exams || clean.exams;
        }
      } catch (lErr) {
        console.warn('[Firestore] Pre-save live logs merge warning:', lErr);
      }

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
                explicitDeletedTeacherIds: options?.explicitDeletedTeacherIds,
                preferIncomingMeta: true
              }
            );
            clean.students = tempMerged.students || clean.students;
            clean.teachers = tempMerged.teachers || clean.teachers;
            clean.classes = tempMerged.classes || clean.classes;
            clean.schoolLocation = tempMerged.schoolLocation || clean.schoolLocation;
            clean.landingPageSettings = tempMerged.landingPageSettings || clean.landingPageSettings;
            clean.contactMessages = tempMerged.contactMessages || clean.contactMessages;
            if (state.adminAllowedSessionId !== undefined) {
              clean.adminAllowedSessionId = state.adminAllowedSessionId;
            } else if (tempMerged.adminAllowedSessionId !== undefined) {
              clean.adminAllowedSessionId = tempMerged.adminAllowedSessionId;
            }
            if (state.adminSessionId !== undefined) {
              clean.adminSessionId = state.adminSessionId;
            } else if (tempMerged.adminSessionId !== undefined) {
              clean.adminSessionId = tempMerged.adminSessionId;
            }
            if (state.adminRevokeTime !== undefined) {
              clean.adminRevokeTime = state.adminRevokeTime;
            } else if (tempMerged.adminRevokeTime !== undefined) {
              clean.adminRevokeTime = tempMerged.adminRevokeTime;
            }
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
          adminSessionId: clean.adminSessionId || null,
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
                xawaaladaTransactions: liveFin.xawaaladaTransactions || [],
                xawaaladaSettings: liveFin.xawaaladaSettings || null
              },
              state,
              {
                userRole: 'admin',
                explicitDeletedInvoiceIds: options?.explicitDeletedInvoiceIds,
                preferIncomingMeta: true
              }
            );
            clean.billing = tempFinMerged.billing || clean.billing;
            clean.invoices = tempFinMerged.invoices || clean.invoices;
            clean.moneyTransfers = tempFinMerged.moneyTransfers || clean.moneyTransfers;
            clean.xawaaladaAccounts = tempFinMerged.xawaaladaAccounts || clean.xawaaladaAccounts;
            clean.xawaaladaTransactions = tempFinMerged.xawaaladaTransactions || clean.xawaaladaTransactions;
            clean.xawaaladaSettings = tempFinMerged.xawaaladaSettings || clean.xawaaladaSettings;
          }
        } catch (finErr) {
          console.warn('[Firestore] Pre-save live finance merge warning:', finErr);
        }

        const financeData = {
          billing: clean.billing || [],
          invoices: clean.invoices || [],
          moneyTransfers: clean.moneyTransfers || [],
          xawaaladaAccounts: clean.xawaaladaAccounts || [],
          xawaaladaTransactions: clean.xawaaladaTransactions || [],
          xawaaladaSettings: clean.xawaaladaSettings || null
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
    }, 30);
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

