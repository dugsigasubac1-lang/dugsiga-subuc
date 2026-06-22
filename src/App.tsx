/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, saveDatabase, mergeSeedRemittances } from './db';
import { DatabaseState, Teacher } from './types';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { LandingPage } from './components/LandingPage';
import { API_BASE } from './config';
import { 
  isDirectFirebasePreferred, 
  fetchRemoteDatabaseState, 
  saveRemoteDatabaseState, 
  subscribeToRemoteDatabaseState 
} from './firebase-client';

export default function App() {
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | null>(() => {
    const savedRole = localStorage.getItem('dugsi_user_role');
    return (savedRole === 'admin' || savedRole === 'teacher') ? savedRole : null;
  });
  const [loggedTeacher, setLoggedTeacher] = useState<Teacher | null>(() => {
    const savedTeacher = localStorage.getItem('dugsi_logged_teacher');
    try {
      return savedTeacher ? JSON.parse(savedTeacher) : null;
    } catch {
      return null;
    }
  });
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Dynamic SEO & Document Title updates based on user role and view
  useEffect(() => {
    let title = "Dugsiga Subuc | Xaraf Saxan iyo Xifdi Sugan";
    let desc = "Dugsiga Subuc waa dugsi ku yaal Garowe oo bixiya xifdinta Qur'aanka Kariimka ah, higaadda Carabiga, iyo waxbarasho tayo leh.";

    if (showLogin) {
      title = "Gala Portal-ka Dugsiga Subuc | Login";
      desc = "Maamul aqoonsigaaga fasalka, dhibcaha ardayda, iyo biilasha. Gala portal-ka rasmiga ah ee Dugsiga Subuc.";
    } else if (userRole === 'admin') {
      title = "Dashboard-ka Maamulka | Dugsiga Subuc";
      desc = "Maamul nidaamka guud ee Dugsiga Subuc - Maamulayaasha, ardayda, lacag-bixinta, iyo warbixinnada.";
    } else if (userRole === 'teacher') {
      title = "Dashboard-ka Macallinka | Dugsiga Subuc";
      desc = "Nidaamka diiwaangelinta horumarka ardayda Dugsiga Subuc ee maalinlaha ah.";
    }

    document.title = title;

    // Update meta description dynamically in DOM for best-practice SPA transitions
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', desc);
    }
  }, [showLogin, userRole]);

  // Synchronize logged-in teacher state with latest server/cached database changes
  useEffect(() => {
    if (userRole === 'teacher' && loggedTeacher && database) {
      const freshTeacher = database.teachers.find(t => t.id === loggedTeacher.id);
      if (freshTeacher) {
        if (JSON.stringify(freshTeacher) !== JSON.stringify(loggedTeacher)) {
          setLoggedTeacher(freshTeacher);
          localStorage.setItem('dugsi_logged_teacher', JSON.stringify(freshTeacher));
        }
      } else {
        // Logged teacher was deleted from the database
        handleLogout();
      }
    }
  }, [database, userRole, loggedTeacher]);

  // Real-time concurrent login validation (logs active session out if hijacked by another device)
  useEffect(() => {
    if (!database) return;
    const currentDeviceSessionId = localStorage.getItem('dugsi_session_id');
    if (!currentDeviceSessionId) return;

    if (userRole === 'teacher' && loggedTeacher) {
      const dbTeacher = database.teachers.find(t => t.id === loggedTeacher.id);
      if (dbTeacher && dbTeacher.currentSessionId && dbTeacher.currentSessionId !== currentDeviceSessionId) {
        handleLogout();
        setSessionExpiredMsg("Waa lagaa saaray nidaamka sababtoo ah koontadaada waxaa laga isticmaalayaa aalad kale.");
        setShowLogin(true);
      }
    }
  }, [database, userRole, loggedTeacher]);

  // Initialize Database on Mount and synchronize
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    async function initDb() {
      if (isDirectFirebasePreferred()) {
        console.info('[Dugsiga Subuc] Prefers direct client-side Firestore connection.');
        try {
          const directData = await fetchRemoteDatabaseState();
          if (active) {
            if (directData) {
              const { updated, changed } = mergeSeedRemittances(directData);
              setDatabase(updated);
              saveDatabase(updated);
              if (changed) {
                await saveRemoteDatabaseState(updated);
              }
            } else {
              const clientDb = getDatabase();
              setDatabase(clientDb);
              await saveRemoteDatabaseState(clientDb);
            }
          }
        } catch (err) {
          console.warn('[Dugsiga Subuc] Direct Firebase fetch failed. Using local cache.', err);
          if (active) {
            setDatabase(getDatabase());
          }
        }

        // Setup real-time listener
        if (active) {
          unsubscribe = subscribeToRemoteDatabaseState((remoteDb) => {
            if (Date.now() - lastSaveTimeRef.current < 4000) {
              return;
            }
            if (active && remoteDb) {
              const remoteStateStr = JSON.stringify(remoteDb);
              setDatabase(currentDb => {
                if (!currentDb) return remoteDb;
                if (JSON.stringify(currentDb) !== remoteStateStr) {
                  saveDatabase(remoteDb);
                  return remoteDb;
                }
                return currentDb;
              });
            }
          });
        }
        return;
      }

      // Backend API Route Flow
      try {
        const res = await fetch(`${API_BASE}/api/database?_t=${Date.now()}`);
        const serverResult = await res.json();
        
        if (active) {
          if (serverResult && serverResult.initialized && serverResult.data) {
            const { updated, changed } = mergeSeedRemittances(serverResult.data);
            setDatabase(updated);
            saveDatabase(updated);
            if (changed) {
              fetch(`${API_BASE}/api/database`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
              }).catch(e => console.warn("Failed back-sync of merged seeds", e));
            }
          } else {
            const clientDb = getDatabase();
            setDatabase(clientDb);
            await fetch(`${API_BASE}/api/database`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(clientDb)
            });
          }
        }
      } catch (error) {
        console.warn("Failed to connect to backend API on initialization. Checking Direct Firebase fallback...", error);
        
        if (active) {
          try {
            const directData = await fetchRemoteDatabaseState();
            if (active && directData) {
              setDatabase(directData);
              saveDatabase(directData);
              
              // Subscribe as fallback
              unsubscribe = subscribeToRemoteDatabaseState((remoteDb) => {
                if (Date.now() - lastSaveTimeRef.current < 4000) return;
                if (active && remoteDb) {
                  const remoteStateStr = JSON.stringify(remoteDb);
                  setDatabase(currentDb => {
                    if (!currentDb) return remoteDb;
                    if (JSON.stringify(currentDb) !== remoteStateStr) {
                      saveDatabase(remoteDb);
                      return remoteDb;
                    }
                    return currentDb;
                  });
                }
              });
              return;
            }
          } catch (fbErr) {
            console.warn("Direct Firebase fetch fallback failed too. Using local cache.", fbErr);
          }
          const clientDb = getDatabase();
          setDatabase(clientDb);
        }
      }
    }

    initDb();
    
    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Poll the database server every 2 seconds for real-time multi-device sync
  useEffect(() => {
    if (isDirectFirebasePreferred()) {
      return; // Handled dynamically via live Firestore observer
    }
    let active = true;

    const intervalId = setInterval(async () => {
      if (Date.now() - lastSaveTimeRef.current < 4000) {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/database?_t=${Date.now()}`);
        const serverResult = await res.json();
        
        if (active && serverResult && serverResult.initialized && serverResult.data) {
          if (Date.now() - lastSaveTimeRef.current < 4000) {
            return;
          }
          const serverStateStr = JSON.stringify(serverResult.data);
          
          setDatabase(currentDb => {
            if (!currentDb) return serverResult.data;
            const currentDbStr = JSON.stringify(currentDb);
            if (currentDbStr !== serverStateStr) {
              saveDatabase(serverResult.data);
              return serverResult.data;
            }
            return currentDb;
          });
        }
      } catch (error) {
        // Handled silently
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleSaveDatabaseState = async (updatedDb: DatabaseState) => {
    // 1. Lock the polling from overwriting state
    lastSaveTimeRef.current = Date.now();

    // 2. Reflect changes in UI immediately for premium, responsive performance
    setDatabase(updatedDb);
    // 3. Save in local recovery cache
    saveDatabase(updatedDb);

    // 4. Send update to server in background
    if (isDirectFirebasePreferred()) {
      try {
        await saveRemoteDatabaseState(updatedDb);
        lastSaveTimeRef.current = Date.now();
      } catch (error) {
        console.error("Failed to save state to Firebase Firestore.", error);
      }
      return;
    }

    try {
      const currentDeviceSessionId = localStorage.getItem('dugsi_session_id') || '';
      const response = await fetch(`${API_BASE}/api/database`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Role': userRole || '',
          'X-Teacher-Id': loggedTeacher?.id || '',
          'X-Session-Id': currentDeviceSessionId
        },
        body: JSON.stringify(updatedDb)
      });
      
      if (!response.ok) {
        const errResult = await response.json().catch(() => ({}));
        if (errResult.error === 'session_expired') {
          handleLogout();
          setSessionExpiredMsg("Waa lagaa saaray nidaamka sababtoo ah koontadaada waxaa laga isticmaalayaa aalad kale.");
          setShowLogin(true);
          return;
        }
      }
      
      // Extend lock for a bit to allow server response stream to stabilize
      lastSaveTimeRef.current = Date.now();
    } catch (error) {
      console.error("Failed to synchronize state update with background database server. Retrying Direct Firebase save...", error);
      try {
        await saveRemoteDatabaseState(updatedDb);
      } catch (fbErr) {
        console.error("Fallback Direct Firebase save failed too.", fbErr);
      }
    }
  };

  const handleLoginSuccess = (role: 'admin' | 'teacher', userEntity?: any) => {
    setUserRole(role);
    setShowLogin(false);
    localStorage.setItem('dugsi_user_role', role);
    if (role === 'teacher' && userEntity) {
      setLoggedTeacher(userEntity);
      localStorage.setItem('dugsi_logged_teacher', JSON.stringify(userEntity));
    } else {
      setLoggedTeacher(null);
      localStorage.removeItem('dugsi_logged_teacher');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoggedTeacher(null);
    localStorage.removeItem('dugsi_user_role');
    localStorage.removeItem('dugsi_logged_teacher');
  };

  if (!database) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Waxaa la dhexgelinayaa xogta Dugsiga Subuc...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {userRole === null && !showLogin && (
        <LandingPage 
          database={database} 
          onEnterLogin={() => setShowLogin(true)} 
          onSaveDatabase={handleSaveDatabaseState}
        />
      )}

      {userRole === null && showLogin && (
        <LoginScreen 
          database={database}
          onLoginSuccess={handleLoginSuccess} 
          onBackToLanding={() => setShowLogin(false)}
          onSaveDatabase={handleSaveDatabaseState}
          sessionExpiredMsg={sessionExpiredMsg}
          onClearExpiredMsg={() => setSessionExpiredMsg(null)}
        />
      )}

      {userRole === 'admin' && (
        <AdminDashboard 
          database={database} 
          onSaveDatabase={handleSaveDatabaseState} 
          onLogout={handleLogout} 
        />
      )}

      {userRole === 'teacher' && loggedTeacher && (
        <TeacherDashboard 
          teacher={loggedTeacher} 
          database={database} 
          onSaveDatabase={handleSaveDatabaseState} 
          onLogout={handleLogout} 
        />
      )}
    </>
  );
}

