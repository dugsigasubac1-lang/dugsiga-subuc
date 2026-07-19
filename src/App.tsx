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
  const [database, setDatabase] = useState<DatabaseState | null>(() => {
    try {
      return getDatabase();
    } catch (e) {
      console.warn('[Dugsiga Subuc] Failed to load initial local database:', e);
      return null;
    }
  });
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
  const [globalSaveStatus, setGlobalSaveStatus] = useState<{
    type: 'success' | 'error' | 'loading' | 'warning' | null;
    message: string | null;
  }>({ type: null, message: null });
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);
  const lastSaveTimeRef = useRef<number>(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.info('[Dugsiga Subuc] Device went online.');
    };
    const handleOffline = () => {
      setIsOffline(true);
      console.warn('[Dugsiga Subuc] Device went offline.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (!isOffline && database) {
      console.info('[Dugsiga Subuc] Connection restored. Auto-synchronizing with Firestore...');
      setGlobalSaveStatus({ type: 'loading', message: 'Khadka internet-ka ayaa ku laabtay. Waxaa la dhexgelinayaa xogtii ugu dambaysay...' });
      
      fetchRemoteDatabaseState()
        .then(directData => {
          if (directData) {
            const { updated } = mergeSeedRemittances(directData);
            setDatabase(currentDb => {
              const remoteTime = updated.lastUpdatedTime || 0;
              const localTime = currentDb?.lastUpdatedTime || 0;
              if (remoteTime > localTime) {
                console.info('[Dugsiga Subuc] Synced newer remote state on reconnect.', remoteTime, localTime);
                saveDatabase(updated);
                return updated;
              }
              return currentDb;
            });
            setGlobalSaveStatus({ type: 'success', message: 'Waa la isku dhex-galiyay xogtii ugu dambaysay ee server-ka!' });
            setTimeout(() => {
              setGlobalSaveStatus(prev => prev.type === 'success' ? { type: null, message: null } : prev);
            }, 3000);
          }
        })
        .catch(err => {
          console.warn('[Dugsiga Subuc] Automatic reconnect sync failed:', err);
          setGlobalSaveStatus({ type: 'error', message: 'Waa lagu guuldarraystay dhex-gelinta xogta cusub ee server-ka.' });
        });
    }
  }, [isOffline]);

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
              if (!updated.lastUpdatedTime) {
                updated.lastUpdatedTime = Date.now();
              }
              setDatabase(updated);
              saveDatabase(updated);
              if (changed) {
                await saveRemoteDatabaseState(updated);
              }
            } else {
              // Firestore system/state is currently null/unseeded!
              // Hit backend GET route to seed from full server-side database.json (containing 34 students) rather than saving empty template!
              console.info('[Dugsiga Subuc] Remote database is empty. Seeding from server database.json...');
              const res = await fetch(`${API_BASE}/api/database?_t=${Date.now()}`);
              if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
              }
              const serverResult = await res.json();
              if (active && serverResult && serverResult.initialized && serverResult.data) {
                const { updated } = mergeSeedRemittances(serverResult.data);
                if (!updated.lastUpdatedTime) {
                  updated.lastUpdatedTime = Date.now();
                }
                setDatabase(updated);
                saveDatabase(updated);
                await saveRemoteDatabaseState(updated);
              } else {
                const clientDb = getDatabase();
                if (!clientDb.lastUpdatedTime) {
                  clientDb.lastUpdatedTime = Date.now();
                }
                setDatabase(clientDb);
              }
            }
          }
        } catch (err) {
          console.warn('[Dugsiga Subuc] Direct Firebase fetch failed. Using local cache for offline viewing.', err);
          if (active) {
            // CRITICAL: Load from localStorage cache, but DO NOT overwrite Firestore!
            const cachedDb = getDatabase();
            setDatabase(cachedDb);
            setGlobalSaveStatus({
              type: 'error',
              message: 'Ma jiro xiriir internet ama khadku waa gaabis. Waxaad ku shaqeynaysaa xogta aaladda ku kaydsan (Offline/Cached).'
            });
          }
        }

        // Setup real-time listener
        if (active) {
          unsubscribe = subscribeToRemoteDatabaseState((remoteDb) => {
            if (active && remoteDb) {
              const remoteTime = remoteDb.lastUpdatedTime || 0;
              setDatabase(currentDb => {
                if (!currentDb) return remoteDb;
                const localTime = currentDb.lastUpdatedTime || 0;
                
                // Compare timestamps precisely rather than using an arbitrary blind 4-second timeout
                if (remoteTime > localTime) {
                  console.info('[Dugsiga Subuc] Received newer database state from Firestore Cloud. Synchronizing...', remoteTime, localTime);
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
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        const serverResult = await res.json();
        
        if (active) {
          if (serverResult && serverResult.error) {
            throw new Error(serverResult.message || serverResult.error);
          }
          if (serverResult && serverResult.initialized && serverResult.data) {
            const { updated, changed } = mergeSeedRemittances(serverResult.data);
            if (!updated.lastUpdatedTime) {
              updated.lastUpdatedTime = Date.now();
            }
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
            if (!clientDb.lastUpdatedTime) {
              clientDb.lastUpdatedTime = Date.now();
            }
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
                if (active && remoteDb) {
                  const remoteTime = remoteDb.lastUpdatedTime || 0;
                  setDatabase(currentDb => {
                    if (!currentDb) return remoteDb;
                    const localTime = currentDb.lastUpdatedTime || 0;
                    if (remoteTime > localTime) {
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
    // 1. Assign new timestamp to track modifications
    const now = Date.now();
    const dbWithTimestamp = {
      ...updatedDb,
      lastUpdatedTime: now
    };

    // 2. Lock the listener from overwriting immediately
    lastSaveTimeRef.current = now;

    // Optimistically save locally to localStorage and update component state
    saveDatabase(dbWithTimestamp);
    setDatabase(dbWithTimestamp);

    if (isOffline) {
      setGlobalSaveStatus({ 
        type: 'warning', 
        message: 'Aaladdaadu hadda khadka kama jirto (Offline). Xogta waxaa lagu kaydiyay gudaha aaladda waxaana loo gudbin doonaa cloud-ka marka khadku soo laabto.' 
      });
      // Fire-and-forget background save so Firestore queues the write
      if (isDirectFirebasePreferred()) {
        saveRemoteDatabaseState(dbWithTimestamp).catch(() => {});
      }
      return;
    }

    setGlobalSaveStatus({ type: 'loading', message: 'La xiriiraya Firestore cloud...' });

    // 2. Direct client-side Firestore flow
    if (isDirectFirebasePreferred()) {
      try {
        // Data Integrity Guard: Fetch remote state first to verify nobody else saved a newer version
        let remoteState: DatabaseState | null = null;
        try {
          remoteState = await fetchRemoteDatabaseState();
        } catch (fetchErr) {
          console.warn('[Dugsiga Subuc] Failed to verify remote version before writing:', fetchErr);
        }

        if (remoteState && remoteState.lastUpdatedTime && remoteState.lastUpdatedTime > (database?.lastUpdatedTime || 0)) {
          // Conflict detected: remote state is newer than what we originally loaded!
          setGlobalSaveStatus({ 
            type: 'error', 
            message: 'Digniin: Waxaa jira xog ka cusub tan oo qof kale uu kaydiyay server-ka. Fadlan dib u cusbooneysii (refresh) bogga si aysan xogtu u tirtirmin.' 
          });
          return;
        }

        // Perform the Firestore write
        const savePromise = saveRemoteDatabaseState(dbWithTimestamp);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore operation timed out')), 25000)
        );

        const success = await Promise.race([savePromise, timeoutPromise]);
        
        if (success) {
          setGlobalSaveStatus({ type: 'success', message: 'Si guul leh ayaa loo kaydiyay xogta!' });
          setTimeout(() => {
            setGlobalSaveStatus(prev => prev.type === 'success' ? { type: null, message: null } : prev);
          }, 4000);
          lastSaveTimeRef.current = Date.now();
        } else {
          throw new Error('Firestore save returned failed status');
        }
      } catch (error) {
        console.error('[Dugsiga Subuc] Failed to save state to Firebase Firestore.', error);
        setGlobalSaveStatus({ 
          type: 'error', 
          message: 'Kaydinta waa ay guuldaraysatay. Fadlan hubi khadkaaga internet-ka oo dib u tijaabi.' 
        });
        throw error;
      }
      return;
    }

    // 3. Backend API Route Flow
    try {
      const currentDeviceSessionId = localStorage.getItem('dugsi_session_id') || '';
      const savePromise = fetch(`${API_BASE}/api/database`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Role': userRole || '',
          'X-Teacher-Id': loggedTeacher?.id || '',
          'X-Session-Id': currentDeviceSessionId
        },
        body: JSON.stringify(dbWithTimestamp)
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API request timed out')), 35000)
      );

      const response = await Promise.race([savePromise, timeoutPromise]);
      
      if (!response.ok) {
        const errResult = await response.json().catch(() => ({}));
        if (errResult.error === 'session_expired') {
          handleLogout();
          setSessionExpiredMsg("Waa lagaa saaray nidaamka sababtoo ah koontadaada waxaa laga isticmaalayaa aalad kale.");
          setShowLogin(true);
          setGlobalSaveStatus({ type: null, message: null });
          return;
        }
        throw new Error(errResult.message || `HTTP error ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setGlobalSaveStatus({ type: 'success', message: 'Si guul leh ayaa loo kaydiyay xogta!' });
        setTimeout(() => {
          setGlobalSaveStatus(prev => prev.type === 'success' ? { type: null, message: null } : prev);
        }, 4000);
        lastSaveTimeRef.current = Date.now();
      } else {
        throw new Error(result.message || 'Server returned failed status');
      }
    } catch (error) {
      console.error("[Dugsiga Subuc] Failed to synchronize state update with background database server.", error);
      setGlobalSaveStatus({ 
        type: 'error', 
        message: 'Kaydinta waa ay guuldaraysatay. Fadlan hubi khadkaaga internet-ka.' 
      });
      throw error;
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
      {isOffline && (
        <div className="bg-amber-600 text-white text-[11px] sm:text-xs font-semibold py-2.5 px-4 text-center sticky top-0 z-[10000] flex items-center justify-center gap-2 shadow-md transition-all duration-300">
          <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
          <span><strong>Khadka waa ka baxsan tahay (Offline)</strong> — Xogta la muujiyay waxaa laga yaabaa inaysan ahayn tii ugu dambaysay. Nidaamku wuxuu si otomaatig ah ula dhexgelin doonaa Firestore marka aad khadka ku soo laabato.</span>
        </div>
      )}

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

      {globalSaveStatus.type && (
        <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border max-w-sm transition-all duration-300 ${
          globalSaveStatus.type === 'loading' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          globalSaveStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          globalSaveStatus.type === 'warning' ? 'bg-amber-100 border-amber-300 text-amber-950 animate-bounce' :
          'bg-rose-50 border-rose-200 text-rose-900 animate-pulse'
        }`}>
          {globalSaveStatus.type === 'loading' && (
            <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {globalSaveStatus.type === 'success' && (
            <span className="text-emerald-600 flex-shrink-0">✓</span>
          )}
          {globalSaveStatus.type === 'warning' && (
            <span className="text-amber-600 flex-shrink-0 font-bold">⚠️</span>
          )}
          {globalSaveStatus.type === 'error' && (
            <span className="text-rose-600 flex-shrink-0 font-bold">⚠️</span>
          )}
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {globalSaveStatus.message}
          </div>
          {(globalSaveStatus.type === 'error' || globalSaveStatus.type === 'warning') && (
            <button 
              onClick={() => setGlobalSaveStatus({ type: null, message: null })} 
              className="ml-2 text-slate-500 hover:text-slate-700 font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </>
  );
}

