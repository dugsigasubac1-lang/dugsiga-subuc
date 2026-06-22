/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, GraduationCap, ArrowRight, Lock, User, AlertTriangle, X, Eye, EyeOff, Wrench, Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { DatabaseState, Teacher } from '../types';
import { DugsigaSubucFullLogo } from './Logo';
import { API_BASE } from '../config';

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // OS detection
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  // Browser detection
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/edge|edg/i.test(ua)) browser = "Edge";
  else if (/opr/i.test(ua)) browser = "Opera";

  const isMobile = /mobile/i.test(ua);
  const deviceType = isMobile ? "Mobile Phone" : "Laptop/PC";

  return `${browser} on ${os} (${deviceType})`;
}

interface LoginScreenProps {
  database: DatabaseState;
  onLoginSuccess: (role: 'admin' | 'teacher', userEntity?: any) => void;
  onBackToLanding?: () => void;
  onSaveDatabase: (updatedDb: DatabaseState) => void;
  sessionExpiredMsg: string | null;
  onClearExpiredMsg: () => void;
}

export function LoginScreen({ 
  database, 
  onLoginSuccess, 
  onBackToLanding,
  onSaveDatabase,
  sessionExpiredMsg,
  onClearExpiredMsg
}: LoginScreenProps) {
  const [activeTab, setActiveTab ] = useState<'admin' | 'teacher'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Diagnostic states
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setDiagnosticLoading(true);
    setDiagnosticError(null);
    try {
      const res = await fetch(`${API_BASE}/api/diagnostics`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setDiagnosticData(data);
    } catch (err: any) {
      setDiagnosticError(err.message || String(err));
      setDiagnosticData(null);
    } finally {
      setDiagnosticLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onClearExpiredMsg(); // Clear stale system-expired banners on click

    // Device session registration
    const currentDeviceSessionId = (() => {
      let id = localStorage.getItem('dugsi_session_id');
      if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('dugsi_session_id', id);
      }
      return id;
    })();

    if (activeTab === 'admin') {
      if (username.trim() === 'yaxyecabdisalanmohamed1234@gmail.com' && password.trim() === 'yaxye6189600') {
        // Admins are allowed to bypass the concurrent session kicked out rule and can login freely across devices
        onLoginSuccess('admin');
      } else {
        setError('Magaca adeegsadaha ama erayga sirta ah ee Maamulaha waa khalad.');
      }
    } else {
      // Find teacher
      const currTeacher = (database.teachers || []).find(
        (t) => t.username.toLowerCase() === username.trim().toLowerCase() && t.passwordHash === password.trim()
      );

      if (currTeacher) {
        const existingTeacherSession = currTeacher.currentSessionId;
        const info = getDeviceInfo();
        const time = new Date().toLocaleString('so-SO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const updatedTeachers = (database.teachers || []).map(t => 
          t.id === currTeacher.id 
            ? { 
                ...t, 
                currentSessionId: currentDeviceSessionId,
                sessionDeviceInfo: info,
                sessionLoginTime: time
              } 
            : t
        );
        const updatedDb: DatabaseState = {
          ...database,
          teachers: updatedTeachers
        };
        onSaveDatabase(updatedDb);
        onLoginSuccess('teacher', { 
          ...currTeacher, 
          currentSessionId: currentDeviceSessionId,
          sessionDeviceInfo: info,
          sessionLoginTime: time
        });
      } else {
        setError('Soo galka macallinka waa guuldarraystay. Fadlan hubi magaca adeegsadaha iyo erayga sirta ah.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white" id="login-container">
      <div className="w-full max-w-md" id="login-box">
        {/* Logo and branding */}
        <div className="text-center mb-6" id="login-header">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-block"
          >
            <DugsigaSubucFullLogo className="w-56 h-auto" />
          </motion.div>
          <motion.p 
            initial={{ y: -5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-slate-400 text-xs mt-3 font-semibold tracking-wider uppercase"
          >
            Nidaamka Cadaynta & Maamulka Dugsiga
          </motion.p>
        </div>

        {/* Login form container */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative overflow-hidden"
          id="login-card"
        >
          {/* Subtle decoration accent */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600" />

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="mb-5 text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 cursor-pointer outline-none active:scale-95 transition-all"
              id="back-to-landing-btn"
            >
              ← Ku laabo Bogga Hore
            </button>
          )}

          {/* Session hijacking notification banner */}
          {sessionExpiredMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 font-semibold shadow-xs"
              id="session-expired-banner"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-extrabold uppercase text-[10px] tracking-wider block text-amber-900 mb-0.5">KULANKII LAA SOO AFJARAY</span>
                {sessionExpiredMsg}
              </div>
              <button 
                type="button" 
                onClick={onClearExpiredMsg}
                className="text-amber-500 hover:text-amber-700 cursor-pointer active:scale-90 transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Role selector tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8" id="login-role-tabs">
            <button
              onClick={() => {
                setActiveTab('admin');
                setUsername('');
                setPassword('');
                setShowPassword(false);
                setError('');
                onClearExpiredMsg();
              }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-950 shadow-md shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="admin-tab-btn"
            >
              <ShieldAlert className="w-4 h-4" />
              Maamule
            </button>
            <button
              onClick={() => {
                setActiveTab('teacher');
                setUsername('');
                setPassword('');
                setShowPassword(false);
                setError('');
                onClearExpiredMsg();
              }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white text-slate-950 shadow-md shadow-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="teacher-tab-btn"
            >
              <GraduationCap className="w-4 h-4" />
              Macallin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" id="login-credentials-form">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl leading-relaxed"
                id="login-error-alert"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                Magaca Adeegsadaha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeTab === 'admin' ? 'Email-ka Maamulaha' : 'Magacaada'}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 rounded-2xl text-slate-900 transition-all text-sm outline-none font-medium"
                  id="username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                Erayga Sirta ah (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 rounded-2xl text-slate-900 transition-all text-sm outline-none font-medium"
                  id="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 outline-none transition-colors"
                  aria-label={showPassword ? "Qari erayga sirta ah" : "Muuji erayga sirta ah"}
                  id="toggle-password-btn"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 px-6 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-2xl shadow-lg shadow-teal-600/10 hover:shadow-teal-600/20 active:shadow-none flex items-center justify-center gap-2 transition-all group duration-300 cursor-pointer"
                id="submit-login-btn"
              >
                Soo gal Nidaamka
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Connection Diagnostics Board */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              const nextVal = !showDiagnostics;
              setShowDiagnostics(nextVal);
              if (nextVal) {
                runDiagnostics();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-200/65 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-xs border border-slate-300/40"
          >
            <Wrench className="w-3.5 h-3.5" />
            Spot-Check Database & Connection
          </button>
        </div>

        <AnimatePresence>
          {showDiagnostics && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 text-left text-xs text-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-slate-800 tracking-wider uppercase text-[10px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                    Spot-Check & Credentials Registry
                  </span>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={diagnosticLoading}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${diagnosticLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {diagnosticLoading && (
                  <div className="py-4 text-center text-slate-400 font-medium font-sans">
                    Testing server responses, please wait...
                  </div>
                )}

                {diagnosticError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 space-y-2 leading-relaxed font-sans">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-900">Failed to Connect to server:</p>
                        <p className="text-[11px] mt-0.5 font-mono text-rose-800">{diagnosticError}</p>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-lg p-2.5 border border-rose-150 text-[10.5px] text-slate-700 space-y-1.5 leading-normal">
                      <span className="font-bold text-rose-900 block">💡 WHY THIS HAPPENS & HOW TO FIX:</span>
                      <p>
                        If you are browsing on the public domain or a static host (like Netlify), browser security policies prevent direct web requests to the private sandboxed backend environment.
                      </p>
                      <p className="font-bold text-teal-900 mt-1">
                        How to test and preview successfully:
                      </p>
                      <ul className="list-disc pl-3.5 space-y-1 text-slate-600">
                        <li>
                          Open and test the official preview link below (fully authorized with Firestore and cookie session sharing):<br />
                          <a 
                            href="https://ais-pre-62d2s5mys67lzy355x45ja-697605956028.europe-west2.run.app" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline font-mono font-bold text-[9px] break-all"
                          >
                            https://ais-pre-62d2s5mys67lzy355x45ja-697605956028.europe-west2.run.app
                          </a>
                        </li>
                        <li>
                          Note: For standalone static deployments, we can adapt all dashboard operations to integrate directly with Firebase Firestore on the client side, bypassing sandbox proxy backends cleanly.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {diagnosticData && (
                  <div className="space-y-3 font-medium font-sans">
                    {/* Connection indicators */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-2 border border-slate-100">
                        {diagnosticData.firestoreStatus?.connected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-slate-800">Firestore Cloud</p>
                          <p className="text-[9px] text-slate-400">
                            {diagnosticData.firestoreStatus?.connected ? 'Connected' : 'Disconnected'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-xl flex items-center gap-2 border border-slate-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800">Server Backend</p>
                          <p className="text-[9px] text-slate-400">Online</p>
                        </div>
                      </div>
                    </div>

                    {/* Teacher credentials table with quick auto-fill buttons */}
                    <div className="space-y-1.5">
                      <p className="font-extrabold text-slate-600 text-[10px] uppercase tracking-wider">
                        Registered Teachers ({diagnosticData.databaseState?.teachersCount || 0})
                      </p>
                      
                      {(!diagnosticData.databaseState?.teachersList || diagnosticData.databaseState.teachersList.length === 0) ? (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 leading-normal text-[11px]">
                          ⚠️ <span className="font-bold text-amber-950">No teachers are registered in the system yet!</span>
                          <p className="mt-1 text-slate-600 text-[10px]">Please log in first as an <strong>Administrator</strong> using your secure email address, then navigate to the "Teachers" section to register custom instructor profiles.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-150 max-h-40 overflow-y-auto pr-1 bg-slate-50 border border-slate-200 rounded-xl">
                          {diagnosticData.databaseState.teachersList.map((t: any) => (
                            <div key={t.id} className="p-2 flex items-center justify-between gap-2 text-[11px]">
                              <div>
                                <p className="font-bold text-slate-800">{t.name}</p>
                                <p className="text-[9px] text-slate-500">
                                  User: <span className="font-mono font-bold text-slate-700 bg-slate-200/70 px-1 rounded">{t.username}</span> | Password: <span className="font-mono font-bold text-slate-700 bg-slate-200/70 px-1 rounded">{t.password}</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('teacher');
                                  setUsername(t.username);
                                  setPassword(t.password);
                                  setError('');
                                }}
                                className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[9px] rounded-lg cursor-pointer transition-all active:scale-95 shrink-0"
                              >
                                Auto-Fill
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* System copyright line */}
        <p className="text-center text-slate-400 text-xs mt-8 font-medium">
          © 2026 Dugsiga Subuc. Dhammaan xuquuqdu waa dhowran tahay.
        </p>
      </div>
    </div>
  );
}
