/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Cloud,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
  Wifi,
  WifiOff,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { DatabaseState } from '../types';
import { initFirebaseClient } from '../firebase-client';
import { getDoc, setDoc, doc } from 'firebase/firestore';

interface SyncDiagnosticToolProps {
  currentDatabase: DatabaseState;
  onRefreshLocalState?: () => Promise<void> | void;
  onStateUpdate?: (newState: DatabaseState) => void;
}

interface CollectionRow {
  key: string;
  label: string;
  somali: string;
  backendCount: number;
  firestoreCount: number;
  localCount: number;
  diff: number;
  isMatch: boolean;
}

export const SyncDiagnosticTool: React.FC<SyncDiagnosticToolProps> = ({
  currentDatabase,
  onRefreshLocalState,
  onStateUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'comparison' | 'partitions' | 'rootcause'>('comparison');

  // Backend API diagnostics data
  const [serverReport, setServerReport] = useState<any>(null);
  const [serverFetchError, setServerFetchError] = useState<string | null>(null);

  // Direct Client-Side Firestore probe data
  const [clientFirestoreData, setClientFirestoreData] = useState<{
    connected: boolean;
    latencyMs: number;
    lastUpdatedTime: number;
    lastUpdatedIso: string | null;
    counts: Record<string, number>;
    totalRecords: number;
    partitions: Record<string, { exists: boolean; sizeBytes?: number; error?: string }>;
    writeTestSuccess: boolean;
    writeTestError: string | null;
    error: string | null;
  } | null>(null);

  const countStateRecords = useCallback((st: any) => ({
    students: Array.isArray(st?.students) ? st.students.length : 0,
    teachers: Array.isArray(st?.teachers) ? st.teachers.length : 0,
    classes: Array.isArray(st?.classes) ? st.classes.length : 0,
    invoices: Array.isArray(st?.invoices) ? st.invoices.length : 0,
    billing: Array.isArray(st?.billing) ? st.billing.length : 0,
    moneyTransfers: Array.isArray(st?.moneyTransfers) ? st.moneyTransfers.length : 0,
    xawaaladaAccounts: Array.isArray(st?.xawaaladaAccounts) ? st.xawaaladaAccounts.length : 0,
    xawaaladaTransactions: Array.isArray(st?.xawaaladaTransactions) ? st.xawaaladaTransactions.length : 0,
    exams: Array.isArray(st?.exams) ? st.exams.length : 0,
    teacherAttendance: Array.isArray(st?.teacherAttendance) ? st.teacherAttendance.length : 0,
    submissions: Array.isArray(st?.submissions) ? st.submissions.length : 0,
    contactMessages: Array.isArray(st?.contactMessages) ? st.contactMessages.length : 0,
    notifications: Array.isArray(st?.notifications) ? st.notifications.length : 0,
    progress: Array.isArray(st?.progress) ? st.progress.length : 0
  }), []);

  const runFullDiagnostic = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    setServerFetchError(null);

    // 1. Fetch Primary Backend API Diagnostics
    try {
      const serverResp = await fetch('/api/diagnostics', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (serverResp.ok) {
        const sData = await serverResp.json();
        setServerReport(sData);
      } else {
        setServerFetchError(`Server returned status ${serverResp.status} ${serverResp.statusText}`);
      }
    } catch (err: any) {
      setServerFetchError(err?.message || 'Failed to reach primary backend API');
    }

    // 2. Run Direct Client-Side Firestore Probe from the Browser
    const fsStart = Date.now();
    try {
      const { db, coreDocRef, progressDocRef, financeDocRef, logsDocRef, stateDocRef } = initFirebaseClient();
      if (!db || !coreDocRef) {
        throw new Error('Firebase client SDK could not initialize Firestore references.');
      }

      const [coreSnap, progSnap, finSnap, logsSnap, stateSnap] = await Promise.all([
        getDoc(coreDocRef).catch((e: any) => ({ error: e?.message })),
        getDoc(progressDocRef).catch((e: any) => ({ error: e?.message })),
        getDoc(financeDocRef).catch((e: any) => ({ error: e?.message })),
        getDoc(logsDocRef).catch((e: any) => ({ error: e?.message })),
        stateDocRef ? getDoc(stateDocRef).catch((e: any) => ({ error: e?.message })) : null
      ]);

      const fsLatency = Date.now() - fsStart;
      let assembled: any = {};
      const partitions: Record<string, any> = {
        core: { exists: false },
        progress: { exists: false },
        finance: { exists: false },
        logs: { exists: false },
        legacyState: { exists: false }
      };

      if (coreSnap && 'exists' in coreSnap && coreSnap.exists()) {
        const d = coreSnap.data() as any;
        partitions.core.exists = true;
        partitions.core.sizeBytes = JSON.stringify(d).length;
        assembled.teachers = d.teachers || [];
        assembled.students = d.students || [];
        assembled.classes = d.classes || [];
        assembled.contactMessages = d.contactMessages || [];
        assembled.lastUpdatedTime = d.lastUpdatedTime || 0;
      }

      if (progSnap && 'exists' in progSnap && progSnap.exists()) {
        const d = progSnap.data() as any;
        partitions.progress.exists = true;
        partitions.progress.sizeBytes = JSON.stringify(d).length;
        assembled.progress = d.progress || [];
      }

      if (finSnap && 'exists' in finSnap && finSnap.exists()) {
        const d = finSnap.data() as any;
        partitions.finance.exists = true;
        partitions.finance.sizeBytes = JSON.stringify(d).length;
        assembled.billing = d.billing || [];
        assembled.invoices = d.invoices || [];
        assembled.moneyTransfers = d.moneyTransfers || [];
        assembled.xawaaladaAccounts = d.xawaaladaAccounts || [];
        assembled.xawaaladaTransactions = d.xawaaladaTransactions || [];
      }

      if (logsSnap && 'exists' in logsSnap && logsSnap.exists()) {
        const d = logsSnap.data() as any;
        partitions.logs.exists = true;
        partitions.logs.sizeBytes = JSON.stringify(d).length;
        assembled.exams = d.exams || [];
        assembled.teacherAttendance = d.teacherAttendance || [];
        assembled.submissions = d.submissions || [];
        assembled.notifications = d.notifications || [];
      }

      if (stateSnap && 'exists' in stateSnap && stateSnap.exists()) {
        const d = stateSnap.data() as any;
        partitions.legacyState.exists = true;
        partitions.legacyState.sizeBytes = JSON.stringify(d).length;
        if (!partitions.core.exists && d?.state) {
          assembled = d.state;
        }
      }

      // Browser direct write test
      let writeTestSuccess = false;
      let writeTestError: string | null = null;
      try {
        const testRef = doc(db, 'system', 'client_diagnostic_probe');
        await setDoc(testRef, {
          browserTimestamp: new Date().toISOString(),
          clientAgent: navigator.userAgent
        });
        writeTestSuccess = true;
      } catch (wErr: any) {
        writeTestSuccess = false;
        writeTestError = wErr?.message || String(wErr);
      }

      const fsCounts = countStateRecords(assembled);
      const fsLastUpdated = Number(assembled.lastUpdatedTime || 0);

      setClientFirestoreData({
        connected: true,
        latencyMs: fsLatency,
        lastUpdatedTime: fsLastUpdated,
        lastUpdatedIso: fsLastUpdated ? new Date(fsLastUpdated).toISOString() : null,
        counts: fsCounts,
        totalRecords: Object.values(fsCounts).reduce((a: number, b: number) => a + b, 0),
        partitions,
        writeTestSuccess,
        writeTestError,
        error: null
      });

    } catch (fsErr: any) {
      setClientFirestoreData({
        connected: false,
        latencyMs: Date.now() - fsStart,
        lastUpdatedTime: 0,
        lastUpdatedIso: null,
        counts: countStateRecords(null),
        totalRecords: 0,
        partitions: {},
        writeTestSuccess: false,
        writeTestError: null,
        error: fsErr?.message || 'Failed to communicate directly with Firestore'
      });
    }

    setLoading(false);
  }, [countStateRecords]);

  useEffect(() => {
    runFullDiagnostic();
  }, [runFullDiagnostic]);

  const handleForcePushToFirestore = async () => {
    setActionLoading('push');
    setFeedback(null);
    try {
      const resp = await fetch('/api/diagnostics/force-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push_backend_to_firestore' })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Xogta Server-ka si buuxda ayaa loogu qasbay laguna qoray Cloud Firestore!'
        });
        await runFullDiagnostic();
        if (onRefreshLocalState) await onRefreshLocalState();
      } else {
        throw new Error(data.error || 'Failed to force push to Firestore');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Fashil: ${err?.message || 'Qalad ayaa dhacay intii lagu guda jiray Force Push'}`
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePullFromFirestore = async () => {
    setActionLoading('pull');
    setFeedback(null);
    try {
      const resp = await fetch('/api/diagnostics/force-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull_firestore_to_backend' })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.message || 'Xogtii ugu dambaysay ee Cloud Firestore ayaa lagu soo shubay Server-ka!'
        });
        await runFullDiagnostic();
        if (onRefreshLocalState) await onRefreshLocalState();
      } else {
        throw new Error(data.error || 'Failed to pull from Firestore');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Fashil: ${err?.message || 'Qalad ayaa dhacay intii lagu guda jiray Pull Firestore'}`
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportJson = () => {
    const diagnosticDump = {
      generatedAt: new Date().toISOString(),
      serverReport,
      clientFirestoreData,
      localBrowserStateCounts: countStateRecords(currentDatabase),
      localBrowserLastUpdatedTime: currentDatabase.lastUpdatedTime || null
    };

    const blob = new Blob([JSON.stringify(diagnosticDump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-diagnostic-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    const summary = `
[DUGSIGA SUBUC - DATABASE & SYNC DIAGNOSTIC REPORT]
Timestamp: ${new Date().toISOString()}

1. PRIMARY BACKEND API:
- Status: ${serverFetchError ? 'ERROR' : 'ONLINE'}
- Last Updated Time: ${serverReport?.primaryBackend?.lastUpdatedTime} (${serverReport?.primaryBackend?.lastUpdatedIso || 'N/A'})
- Total Records: ${serverReport?.primaryBackend?.totalRecords ?? 'N/A'}
- Students: ${serverReport?.primaryBackend?.recordCounts?.students ?? 'N/A'}
- Teachers: ${serverReport?.primaryBackend?.recordCounts?.teachers ?? 'N/A'}

2. FIREBASE FIRESTORE CLOUD:
- Status: ${clientFirestoreData?.connected ? 'ONLINE' : 'OFFLINE'}
- Last Updated Time: ${clientFirestoreData?.lastUpdatedTime} (${clientFirestoreData?.lastUpdatedIso || 'N/A'})
- Total Records: ${clientFirestoreData?.totalRecords ?? 'N/A'}
- Students: ${clientFirestoreData?.counts?.students ?? 'N/A'}
- Teachers: ${clientFirestoreData?.counts?.teachers ?? 'N/A'}
- Write Test: ${clientFirestoreData?.writeTestSuccess ? 'SUCCESS' : `FAILED (${clientFirestoreData?.writeTestError})`}

3. SYNC STATUS:
- Status: ${serverReport?.comparison?.syncStatus || 'DESYNCHRONIZED'}
- Mismatched Collections: ${serverReport?.comparison?.mismatchesCount || 0}
- Time Delta (ms): ${serverReport?.comparison?.lastUpdatedDiffMs || 0}
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Prepare collection rows
  const collectionDefs = [
    { key: 'students', label: 'Students', somali: 'Ardayda Dugsiga' },
    { key: 'teachers', label: 'Teachers', somali: 'Macallimiinta' },
    { key: 'classes', label: 'Classes', somali: 'Fasallada' },
    { key: 'invoices', label: 'Invoices', somali: 'Biilasha' },
    { key: 'billing', label: 'Tuition Fees', somali: 'Diiwaanka Lacagaha' },
    { key: 'moneyTransfers', label: 'Money Transfers', somali: 'Xawaaladaha' },
    { key: 'xawaaladaAccounts', label: 'Xawaalada Accounts', somali: 'Akoonnada Xawaaladda' },
    { key: 'xawaaladaTransactions', label: 'Xawaalada Txns', somali: 'Dhaqdhaqaaqa Xawaaladda' },
    { key: 'exams', label: 'Weekly Exams', somali: 'Imtixaanaadka Toddobaadlaha' },
    { key: 'teacherAttendance', label: 'Teacher Attendance', somali: 'Xaadirinta Macallimiinta' },
    { key: 'submissions', label: 'Teacher Submissions', somali: 'Gudbinta Macallimiinta' },
    { key: 'contactMessages', label: 'Contact Messages', somali: 'Farriimaha Waalidiinta' },
    { key: 'notifications', label: 'Notifications', somali: 'Ogeysiisyada Nidaamka' },
    { key: 'progress', label: 'Daily Quran Progress', somali: 'Diiwaanka Casharrada' }
  ];

  const localCounts = countStateRecords(currentDatabase);
  const backendCounts = serverReport?.primaryBackend?.recordCounts || {};
  const firestoreCounts = clientFirestoreData?.counts || serverReport?.firebaseFirestore?.recordCounts || {};

  const collectionRows: CollectionRow[] = collectionDefs.map(col => {
    const bCount = backendCounts[col.key] ?? 0;
    const fsCount = firestoreCounts[col.key] ?? 0;
    const lCount = (localCounts as any)[col.key] ?? 0;
    const diff = bCount - fsCount;
    const isMatch = bCount === fsCount;
    return {
      key: col.key,
      label: col.label,
      somali: col.somali,
      backendCount: bCount,
      firestoreCount: fsCount,
      localCount: lCount,
      diff,
      isMatch
    };
  });

  const totalMismatches = collectionRows.filter(r => !r.isMatch).length;

  const backendLastUpdated = serverReport?.primaryBackend?.lastUpdatedTime || 0;
  const firestoreLastUpdated = clientFirestoreData?.lastUpdatedTime || serverReport?.firebaseFirestore?.lastUpdatedTime || 0;
  const localLastUpdated = currentDatabase.lastUpdatedTime || 0;

  const timeDiffMs = backendLastUpdated - firestoreLastUpdated;
  const isTimeSynced = Math.abs(timeDiffMs) < 3000;
  const isAllSynced = totalMismatches === 0 && isTimeSynced;

  const formatTimestamp = (ts: number) => {
    if (!ts || ts === 0) return 'Lama helin (0)';
    try {
      const date = new Date(ts);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${ts})`;
    } catch {
      return String(ts);
    }
  };

  const getRelativeTimeString = (ts: number) => {
    if (!ts || ts === 0) return 'Waligiis';
    const now = Date.now();
    const diffSec = Math.floor((now - ts) / 1000);
    if (diffSec < 5) return 'Hadda (Just now)';
    if (diffSec < 60) return `${diffSec} ilbiriqsi ka hor`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} daqiiqo ka hor`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours} saacadood ka hor`;
  };

  return (
    <div id="sync-diagnostic-tool-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Qalabka Baadhista Xogta & Is-waafajinta (Database & Sync Diagnostic Tool)
                </h2>
                {isAllSynced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    100% Is-waafaqsan (Synced)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Farqi baa Jira ({totalMismatches} Qaybood)
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-3xl">
                Qalabkani wuxuu toos u barbar-dhigayaa xogta ku jirta <strong>Primary Backend API (Server Memory/Disk)</strong> iyo <strong>Firebase Firestore Cloud</strong> si loo ogaado sababta saxda ah ee is-waafajinta (sync) u fashilantay ama xogta u kala duwantahay.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-run-diagnostic"
              type="button"
              disabled={loading}
              onClick={runFullDiagnostic}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Baadhayaa...' : 'Baadh Xogta Hadda'}</span>
            </button>

            <button
              id="btn-copy-summary"
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
              title="Koobiyi qoraalka warbixinta"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'La koobiyay!' : 'Koobiyi'}</span>
            </button>

            <button
              id="btn-export-json"
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
              title="Soo deji faylka JSON ee warbixinta"
            >
              <Download className="w-4 h-4" />
              <span>Soo Deji JSON</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-xl text-sm flex items-start gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />}
            {feedback.type === 'error' && <XCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />}
            {feedback.type === 'info' && <Info className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />}
            <div className="flex-1 font-medium">{feedback.message}</div>
          </motion.div>
        )}
      </div>

      {/* 3-Way Core State Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Primary Backend API */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Primary Backend API</h3>
                  <p className="text-xs text-slate-400">Node.js Express / In-Memory State</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                serverFetchError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {serverFetchError ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                {serverFetchError ? 'Offline' : 'Connected'}
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-400">lastUpdatedTime</div>
                <div className="text-sm font-mono font-medium text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{backendLastUpdated || 'N/A'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {formatTimestamp(backendLastUpdated)}
                </div>
                <div className="text-[11px] text-blue-400 mt-0.5 font-medium">
                  {getRelativeTimeString(backendLastUpdated)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Wadarta Diiwaannada:</span>
                <span className="text-base font-bold font-mono text-white">
                  {serverReport?.primaryBackend?.totalRecords ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Disk Cache: {serverReport?.environment?.localDbFileExists ? 'Haa (database.json)' : 'Maya'}</span>
            <span>Port: {serverReport?.environment?.port || 3000}</span>
          </div>
        </div>

        {/* Card 2: Firebase Firestore Cloud */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Firebase Firestore</h3>
                  <p className="text-xs text-slate-400">Google Cloud Database</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                clientFirestoreData?.connected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {clientFirestoreData?.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {clientFirestoreData?.connected ? `${clientFirestoreData.latencyMs}ms` : 'Disconnected'}
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-400">lastUpdatedTime</div>
                <div className="text-sm font-mono font-medium text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{firestoreLastUpdated || 'N/A'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {formatTimestamp(firestoreLastUpdated)}
                </div>
                <div className="text-[11px] text-amber-400 mt-0.5 font-medium">
                  {getRelativeTimeString(firestoreLastUpdated)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Wadarta Diiwaannada:</span>
                <span className="text-base font-bold font-mono text-white">
                  {clientFirestoreData?.totalRecords ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Write Test:</span>
            <span className={clientFirestoreData?.writeTestSuccess ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold flex items-center gap-1'}>
              {clientFirestoreData?.writeTestSuccess ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Waad qori kartaa
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3 h-3" />
                  Qoristu waa xanniban tahay
                </>
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Comparison & Time Drift Delta */}
        <div className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between ${
          isAllSynced
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Farqiga & Is-waafajinta</h3>
                  <p className="text-xs text-slate-400">Time Drift & Sync Delta</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isTimeSynced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {isTimeSynced ? 'Waqti Isku Mid' : 'Waqti Kala Duwan'}
              </span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-400">Farqiga lastUpdatedTime (Time Drift)</div>
                <div className={`text-base font-mono font-bold mt-0.5 ${
                  Math.abs(timeDiffMs) < 1000 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {timeDiffMs === 0
                    ? '0 ms (Isku mid)'
                    : `${timeDiffMs > 0 ? '+' : ''}${(timeDiffMs / 1000).toFixed(2)}s (${timeDiffMs} ms)`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {timeDiffMs > 1000
                    ? '⚡ Primary Backend ayaa ka cusub Cloud Firestore'
                    : timeDiffMs < -1000
                    ? '☁️ Cloud Firestore ayaa ka cusub Primary Backend'
                    : '✅ Labaduba waqtigoodu wuu isku mid yahay'}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Qaybaha Is-waafaqsan:</span>
                <span className="text-sm font-semibold text-white">
                  {collectionRows.length - totalMismatches} / {collectionRows.length}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Xaaladda Guud:</span>
            <span className={`text-xs font-bold ${isAllSynced ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAllSynced ? 'GUUL: Isku mid baa loo wada hayaa' : `DIGNIIN: ${totalMismatches} qaybood baa ku kala duwan`}
            </span>
          </div>
        </div>
      </div>

      {/* Force Sync Actions Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Qasab ku Dhex-geli ama Soo Jiid (Force Sync Actions)</h4>
            <p className="text-xs text-slate-400">
              Haddii xogta server-ka iyo cloud-ka ay kala dambeeyaan, isticmaal badhamadan si aad labada dhinac u waafajiso.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            id="btn-force-push"
            type="button"
            disabled={actionLoading !== null}
            onClick={handleForcePushToFirestore}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm transition-all shadow-md disabled:opacity-50"
          >
            <Server className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5" />
            <Cloud className="w-4 h-4" />
            <span>{actionLoading === 'push' ? 'Qorayaa...' : 'Server → Firestore (Force Push)'}</span>
          </button>

          <button
            id="btn-force-pull"
            type="button"
            disabled={actionLoading !== null}
            onClick={handlePullFromFirestore}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm border border-slate-700 transition-all disabled:opacity-50"
          >
            <Cloud className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5" />
            <Server className="w-4 h-4" />
            <span>{actionLoading === 'pull' ? 'Soo jiidayaa...' : 'Firestore → Server (Pull)'}</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubView('comparison')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubView === 'comparison'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Barbar-dhigga Qaybaha Xogta ({collectionRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('rootcause')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeSubView === 'rootcause'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <span>Sababta Ciladda (Root Cause Analysis)</span>
          {(serverReport?.comparison?.diagnosedIssues?.length > 0 || !clientFirestoreData?.writeTestSuccess) && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">
              {(serverReport?.comparison?.diagnosedIssues?.length || 0) + (!clientFirestoreData?.writeTestSuccess ? 1 : 0)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('partitions')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeSubView === 'partitions'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          Documents-ka Firestore Partitions
        </button>
      </div>

      {/* Sub-View 1: Detailed Side-by-Side Comparison Table */}
      {activeSubView === 'comparison' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Tirada Diiwaannada Qayb Kasta (Record Counts Side-by-Side)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Wadarta Qaybaha: {collectionRows.length} | Isku mid: {collectionRows.filter(r => r.isMatch).length} | Farqi: {totalMismatches}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Qaybta Xogta (Entity)</th>
                  <th className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-blue-400">
                      <Server className="w-3.5 h-3.5" />
                      Primary Backend API
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Cloud className="w-3.5 h-3.5" />
                      Firebase Firestore
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-purple-400">
                      <HardDrive className="w-3.5 h-3.5" />
                      Local Client Browser
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">Farqiga (Delta)</th>
                  <th className="py-3.5 px-4 text-right">Xaaladda (Sync Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {collectionRows.map(row => (
                  <tr
                    key={row.key}
                    className={`transition-colors ${
                      row.isMatch ? 'hover:bg-slate-800/30' : 'bg-rose-950/10 hover:bg-rose-950/20'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                      <div className="font-semibold text-white">{row.somali}</div>
                      <div className="text-xs text-slate-400 font-mono">{row.key} ({row.label})</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-blue-400">
                      <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                        {row.backendCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                        {row.firestoreCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-purple-400">
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                        {row.localCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold">
                      {row.diff === 0 ? (
                        <span className="text-emerald-400 text-xs font-sans font-medium">0 (Isku mid)</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          row.diff > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {row.diff > 0 ? `+${row.diff} (Server)` : `${row.diff} (Cloud)`}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      {row.isMatch ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Isku Mid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Farqi ({Math.abs(row.diff)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-View 2: Root Cause Pinpoint Engine */}
      {activeSubView === 'rootcause' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Natiijada Baadhista Ciladda (Diagnostic Root Cause Analysis)
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Nidaamka baadhista tooska ah wuxuu baadhay shuruucda qorista, cabbirka xogta (partition doc size), xiriirka Cloud Firestore, iyo farqiga waqtiga ee u dhexeeya Server-ka iyo Cloud-ka.
            </p>

            {/* List of Detected Issues */}
            <div className="space-y-3">
              {/* Check 1: Write Test */}
              {!clientFirestoreData?.writeTestSuccess && (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-300">Cilad Qoris: Firestore Write Permission Denied</h4>
                    <p className="text-xs text-rose-200/80 mt-1">
                      Browser-ka ama Server-ka ma awoodo inuu xogta toos ugu qoro Firestore. Cilad: {clientFirestoreData?.writeTestError || 'Permission Denied'}.
                    </p>
                    <p className="text-xs text-slate-300 mt-2 font-medium">
                      💡 <strong>Xalka:</strong> Hubi shuruucda <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">firestore.rules</code> si loo oggolaado qorista nidaamka.
                    </p>
                  </div>
                </div>
              )}

              {/* Check 2: Time desync */}
              {Math.abs(timeDiffMs) > 5000 && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">Waqtiga Xogta oo Kala Dambeeya (Timestamp Desync)</h4>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Farqiga waqtiga waa {(Math.abs(timeDiffMs) / 1000).toFixed(1)} ilbiriqsi. {timeDiffMs > 0 ? 'Server-ka ayaa haysta isbaddallo cusub oo aan weli Cloud-ka gelin.' : 'Cloud-ka ayaa haysta isbaddallo cusub oo aan weli server-ka soo gaarin.'}
                    </p>
                    <p className="text-xs text-slate-300 mt-2 font-medium">
                      💡 <strong>Xalka:</strong> Guji badhanka <strong>"Force Push"</strong> ama <strong>"Pull Firestore"</strong> si aad labada xogood u midaysid.
                    </p>
                  </div>
                </div>
              )}

              {/* Check 3: Mismatches */}
              {totalMismatches > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">Tirada Xogta oo Kala Duwan ({totalMismatches} Qaybood)</h4>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Qaybaha ku kala duwan: {collectionRows.filter(r => !r.isMatch).map(r => `${r.somali} (Server: ${r.backendCount} vs Cloud: ${r.firestoreCount})`).join(', ')}.
                    </p>
                    <p className="text-xs text-slate-300 mt-2 font-medium">
                      💡 <strong>Xalka:</strong> Haddii aad hubto in xogta saxda ahi ay tahay tan Server-ka, riix <strong>"Server → Firestore (Force Push)"</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Check 4: All healthy */}
              {isAllSynced && clientFirestoreData?.writeTestSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Wax Cilad ah Lama Helin (All Systems Synchronized)</h4>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      Dhammaan 14-ka qaybood ee xogta dugsiga, waqtiga lastUpdatedTime, iyo qorista tooska ah ee Cloud Firestore waxay 100% u shaqaynayaan si sax ah.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-View 3: Partition Inspector */}
      {activeSubView === 'partitions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Dhismaha Partition Documents ee Cloud Firestore
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Firestore wuxuu xogta u kala qaybiyaa 4 documents si aan loo dhaafin xadka cabbirka (1MB Document Size Limit).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>system/core</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div>Ardayda: {firestoreCounts.students || 0}</div>
                <div>Macallimiinta: {firestoreCounts.teachers || 0}</div>
                <div>Fasallada: {firestoreCounts.classes || 0}</div>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                  Cabbirka: {clientFirestoreData?.partitions?.core?.sizeBytes ? `${(clientFirestoreData.partitions.core.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>system/progress</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div>Diiwaanka Casharrada: {firestoreCounts.progress || 0}</div>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                  Cabbirka: {clientFirestoreData?.partitions?.progress?.sizeBytes ? `${(clientFirestoreData.partitions.progress.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>system/finance</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div>Biilasha (Invoices): {firestoreCounts.invoices || 0}</div>
                <div>Lacag-bixinta (Billing): {firestoreCounts.billing || 0}</div>
                <div>Xawaaladaha: {firestoreCounts.moneyTransfers || 0}</div>
                <div>Akoonnada: {firestoreCounts.xawaaladaAccounts || 0}</div>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                  Cabbirka: {clientFirestoreData?.partitions?.finance?.sizeBytes ? `${(clientFirestoreData.partitions.finance.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>system/logs</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs text-slate-400 mt-2 space-y-1">
                <div>Imtixaanaadka: {firestoreCounts.exams || 0}</div>
                <div>Xaadirinta Macallimiinta: {firestoreCounts.teacherAttendance || 0}</div>
                <div>Gudbinta Macallimiinta: {firestoreCounts.submissions || 0}</div>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                  Cabbirka: {clientFirestoreData?.partitions?.logs?.sizeBytes ? `${(clientFirestoreData.partitions.logs.sizeBytes / 1024).toFixed(1)} KB` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON Debug Expander */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{showRawJson ? 'Qari Raw JSON Debug Dump' : 'Muuji Raw JSON Debug Dump (Technical Details)'}</span>
        </button>

        {showRawJson && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-slate-300 max-h-96"
          >
            <pre>
              {JSON.stringify(
                {
                  serverReport,
                  clientFirestoreData,
                  localBrowserCounts: localCounts,
                  localLastUpdated
                },
                null,
                2
              )}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  );
};
