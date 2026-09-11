import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Activity,
  HardDriveDownload,
  UploadCloud,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Zap,
  Layers,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  Check
} from 'lucide-react';
import { DatabaseState } from '../types';
import { SyncDiagnosticTool } from './SyncDiagnosticTool';
import { triggerBackupDownload } from '../db';

interface BackupTabProps {
  database: DatabaseState;
  onSaveDatabase: (
    updatedDb: DatabaseState,
    options?: {
      userRole?: 'admin' | 'teacher' | null;
      preferIncomingMeta?: boolean;
    }
  ) => void;
  backupSubTab?: 'diagnostics' | 'backups';
}

interface CloudBackupItem {
  id: string;
  timestamp: string;
  sizeBytes?: number;
  studentsCount?: number;
  teachersCount?: number;
  storageType?: string;
}

export function BackupTab({ database, onSaveDatabase, backupSubTab = 'diagnostics' }: BackupTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'backups'>(backupSubTab);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Browser cache scanner state
  const [foundCacheBackups, setFoundCacheBackups] = useState<Array<{ key: string; origin: string; date: string; data: any }>>([]);
  const [hasScannedCache, setHasScannedCache] = useState<boolean>(false);

  // CSV Import state
  const [csvPreviewStudents, setCsvPreviewStudents] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string>('');

  // Fetch cloud backups list from server
  const fetchCloudBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.backups)) {
        setCloudBackups(data.backups);
      }
    } catch (err) {
      console.error('Failed to fetch cloud backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'backups') {
      fetchCloudBackups();
    }
  }, [activeSubTab]);

  // Trigger manual cloud backup snapshot
  const handleTriggerCloudBackup = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/backups/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Snapshot-ka xogta si guul leh ayaa loogu keydiyay Google Cloud! (${data.backupId || 'Created'})`);
        fetchCloudBackups();
      } else {
        setFeedbackMsg(`Cilad ayaa dhacday: ${data.error || 'Failed to trigger backup'}`);
      }
    } catch (err: any) {
      setFeedbackMsg(`Cilad xiriirka server-ka: ${err.message}`);
    } finally {
      setIsTriggering(false);
      setTimeout(() => setFeedbackMsg(''), 5000);
    }
  };

  // Restore cloud backup
  const handleRestoreCloudBackup = async (backupId: string) => {
    if (!window.confirm(`Ma hubtaa inaad soo celiso backup snapshot "${backupId}"? Tani waxay beddeli doontaa xogta hadda jirta.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/backups/${backupId}/restore`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Si guul leh ayaa loo soo celiyay xogtii backup-ka: ${backupId}!`);
        if (data.databaseState) {
          onSaveDatabase(data.databaseState);
        }
        fetchCloudBackups();
      } else {
        setFeedbackMsg(`Cilad soo celinta: ${data.error || 'Failed to restore'}`);
      }
    } catch (err: any) {
      setFeedbackMsg(`Cilad: ${err.message}`);
    }
  };

  // Delete cloud backup
  const handleDeleteCloudBackup = async (backupId: string) => {
    if (!window.confirm(`Ma hubtaa inaad tirtirto backup "${backupId}"?`)) return;
    try {
      const res = await fetch(`/api/backups/${backupId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`Backup snapshot "${backupId}" waa la tirtiray.`);
        fetchCloudBackups();
      }
    } catch (err: any) {
      setFeedbackMsg(`Cilad: ${err.message}`);
    }
  };

  // Download local JSON file
  const handleDownloadLocalBackup = () => {
    triggerBackupDownload(database);
  };

  // Import local JSON backup file
  const handleImportLocalJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.students && Array.isArray(parsed.students)) {
          if (window.confirm(`Ma hubtaa inaad soo celiso xogta faylka "${file.name}" oo ay ku jiraan ${parsed.students.length} arday?`)) {
            onSaveDatabase(parsed);
            setFeedbackMsg(`Xogtii faylka si guul leh ayaa loo soo celiyay!`);
            setTimeout(() => setFeedbackMsg(''), 5000);
          }
        } else {
          alert('Faylka aad soo gelisay maaha nuqul xog sax ah (Invalid backup JSON structure).');
        }
      } catch (err: any) {
        alert('Cilad akhrinta faylka: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Emergency Cache Scanner
  const handleScanBrowserCache = () => {
    const found: any[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('subuc') || key.includes('dugsi') || key.includes('backup') || key.includes('state'))) {
          try {
            const val = JSON.parse(localStorage.getItem(key) || '{}');
            if (val.students || val.teachers || val.billing) {
              found.push({
                key,
                origin: 'localStorage',
                date: val.lastUpdated || new Date().toISOString(),
                data: val
              });
            }
          } catch {}
        }
      }

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('subuc') || key.includes('dugsi') || key.includes('backup'))) {
          try {
            const val = JSON.parse(sessionStorage.getItem(key) || '{}');
            if (val.students || val.teachers) {
              found.push({
                key,
                origin: 'sessionStorage',
                date: val.lastUpdated || new Date().toISOString(),
                data: val
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
    }

    setFoundCacheBackups(found);
    setHasScannedCache(true);
  };

  // CSV Import handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setCsvError('Faylku ma laha xog ku filan.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const students: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const name = parts[0] || '';
          const parentName = parts[1] || '';
          const parentPhone = parts[2] || '';
          const className = parts[3] || 'Al-Baqarah Memorization';
          const fee = Number(parts[4]) || 35;
          const busFee = Number(parts[5]) || 0;

          if (name) {
            students.push({
              id: `ST-${Date.now().toString().slice(-4)}${i}`,
              name,
              parentName,
              parentPhone,
              className,
              monthlyFee: fee,
              busFee: busFee,
              active: true,
              registrationDate: new Date().toISOString().split('T')[0]
            });
          }
        }
      }

      setCsvPreviewStudents(students);
    };
    reader.readAsText(file);
  };

  const handleBulkImportStudents = () => {
    if (csvPreviewStudents.length === 0) return;
    const newStudents = [...(database.students || []), ...csvPreviewStudents];
    onSaveDatabase({
      ...database,
      students: newStudents
    });
    setFeedbackMsg(`${csvPreviewStudents.length} arday ayaa lagu daray diwaanka dugsiga!`);
    setCsvPreviewStudents([]);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="portal-backup">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex">
              <Cloud className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">
              {activeSubTab === 'diagnostics'
                ? 'Baadhista Sync-ka & Xogta (Cloud Sync Diagnostics)'
                : 'Kaydka & Nuqullada (Backups & Snapshots)'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            La soco isku-xirnaanta Firestore & Google Cloud Storage, qaad nuqullo ama soo celi xog hore.
          </p>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('diagnostics')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'diagnostics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Baadhista Sync-ka</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('backups')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'backups'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Kaydka & Nuqullada</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SYNC DIAGNOSTICS SUBTAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'diagnostics' && (
        <SyncDiagnosticTool currentDatabase={database} onStateUpdate={onSaveDatabase} />
      )}

      {/* ========================================================================= */}
      {/* 2. BACKUPS SUBTAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'backups' && (
        <div className="space-y-6">
          {/* Cloud Automated Backup Status Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-3xl text-white shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-base">Google Cloud Storage & Firestore Persistent Backups</h3>
                </div>
                <p className="text-xs text-indigo-200 font-medium">
                  Xogta dugsiga si toos ah ayaa loogu keydiyaa Google Cloud Firestore & Snapshots.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerCloudBackup}
                disabled={isTriggering}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                {isTriggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{isTriggering ? 'Qaadaya Snapshot...' : 'Qaad Snapshot Hadda'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-indigo-700/60 text-xs">
              <div>
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Ardayda Diwaangashan</span>
                <span className="font-black text-white text-lg">{(database.students || []).length}</span>
              </div>
              <div>
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Macallimiinta</span>
                <span className="font-black text-white text-lg">{(database.teachers || []).length}</span>
              </div>
              <div>
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Diwaannada Lacagta</span>
                <span className="font-black text-white text-lg">{(database.billing || []).length}</span>
              </div>
              <div>
                <span className="text-indigo-300 block text-[10px] uppercase font-bold">Xawaaladda</span>
                <span className="font-black text-white text-lg">{(database.xawaaladaTransactions || []).length}</span>
              </div>
            </div>
          </div>

          {/* Cloud Snapshots Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Nuqullada Cloud-ka (Cloud Snapshots: {cloudBackups.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchCloudBackups}
                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs flex items-center gap-1 font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                <span>Cusboonaysii</span>
              </button>
            </div>

            {cloudBackups.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-xs text-slate-600">Nuqullo cloud ah hadda lama helin</p>
                <p className="text-[11px] mt-0.5">Guji 'Qaad Snapshot Hadda' si aad u abuurto nuqul cusub.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-100">
                      <th className="p-3.5 pl-6">Snapshot ID</th>
                      <th className="p-3.5">Taariikhda</th>
                      <th className="p-3.5">Keydka</th>
                      <th className="p-3.5 text-right pr-6">Tallaabooyinka</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {cloudBackups.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-6 font-mono font-bold text-slate-900">{b.id}</td>
                        <td className="p-3.5 font-mono text-slate-600">{b.timestamp || '-'}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                            {b.storageType || 'GCS / Firestore'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleRestoreCloudBackup(b.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                              title="Soo Celi Xogtan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Soo Celi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCloudBackup(b.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer"
                              title="Tirtir Snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Local JSON Backup & Emergency Restore Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local JSON Backup Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl inline-flex">
                  <HardDriveDownload className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">Nuqul JSON ah (Local Backup)</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Soo dejiso faylka JSON ee xogta oo dhan ama geli nuqul JSON ah oo aad hore u haysatay.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadLocalBackup}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Soo Dejiso JSON Backup</span>
                </button>

                <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer">
                  <UploadCloud className="w-4 h-4 text-slate-600" />
                  <span>Geli JSON Backup</span>
                  <input type="file" accept=".json" onChange={handleImportLocalJson} className="hidden" />
                </label>
              </div>
            </div>

            {/* Emergency Browser Cache Scanner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl inline-flex">
                  <Zap className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">Baadhe Kaydka Browser-ka (Cache Scanner)</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Haddii xog kaaga lunto qalad darteed, baadh kaydka LocalStorage ee browser-kaaga si aad u soo celiso.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScanBrowserCache}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Baadh Browser Cache</span>
                </button>
              </div>

              {hasScannedCache && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Nuqullada laga helay browser-ka ({foundCacheBackups.length}):
                  </span>
                  {foundCacheBackups.length === 0 ? (
                    <p className="text-xs text-slate-400">Nuqullo hore laguma helin browser-ka.</p>
                  ) : (
                    foundCacheBackups.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{c.key}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ardayda: {c.data.students?.length || 0} • {c.origin}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Ma hubtaa inaad soo celiso nuqulka "${c.key}"?`)) {
                              onSaveDatabase(c.data);
                              setFeedbackMsg('Xogtii browser cache-ka waa la soo celiyay!');
                            }
                          }}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold"
                        >
                          Soo Celi
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bulk Student CSV Import Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl inline-flex">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold text-slate-900 text-base">
                Geli Arday Badan Hal Mar (Bulk CSV / Excel Import)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Ku dar boqolaal arday hal mar adiga oo isticmaalaya faylka CSV. Qaabka: Magaca, Magaca Waalidka, Taleefanka, Fasalka, Khidmadda, Khidmadda Baska.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xulo Faylka CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleCsvFileChange} className="hidden" />
              </label>

              {csvPreviewStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkImportStudents}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Ku dar {csvPreviewStudents.length} Arday Database-ka</span>
                </button>
              )}
            </div>

            {csvError && <p className="text-xs text-rose-600 font-bold">{csvError}</p>}

            {csvPreviewStudents.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Magaca</th>
                      <th className="p-2.5">Waalidka</th>
                      <th className="p-2.5">Taleefanka</th>
                      <th className="p-2.5">Fasalka</th>
                      <th className="p-2.5">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreviewStudents.map((s, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-2.5 text-slate-600">{s.parentName}</td>
                        <td className="p-2.5 font-mono text-slate-500">{s.parentPhone}</td>
                        <td className="p-2.5 text-slate-600">{s.className}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">${s.monthlyFee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
