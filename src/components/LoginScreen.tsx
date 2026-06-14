/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, GraduationCap, ArrowRight, Lock, User, AlertTriangle, X } from 'lucide-react';
import { DatabaseState, Teacher } from '../types';
import { DugsigaSubucFullLogo } from './Logo';

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
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
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
      if (username.trim() === 'yaxyecabdisalanmohamed1234@gmail.com' && password === 'yaxye6189600') {
        // Admins are allowed to bypass the concurrent session kicked out rule and can login freely across devices
        onLoginSuccess('admin');
      } else {
        setError('Magaca adeegsadaha ama erayga sirta ah ee Maamulaha waa khalad.');
      }
    } else {
      // Find teacher
      const currTeacher = (database.teachers || []).find(
        (t) => t.username.toLowerCase() === username.trim().toLowerCase() && t.passwordHash === password
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 rounded-2xl text-slate-900 transition-all text-sm outline-none font-medium"
                  id="password-input"
                />
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

        {/* System copyright line */}
        <p className="text-center text-slate-400 text-xs mt-8 font-medium">
          © 2026 Dugsiga Subuc. Dhammaan xuquuqdu waa dhowran tahay.
        </p>
      </div>
    </div>
  );
}
