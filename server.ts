import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const DB_FILE = path.join(process.cwd(), 'database.json');
const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

function sanitizeDatabaseState(state: any): any {
  if (state && typeof state === 'object' && Array.isArray(state.teachers)) {
    let corrected = false;
    state.teachers = state.teachers.map((t: any) => {
      if (t && t.username === 'caac' && t.id === 'T-08') {
        corrected = true;
        return { ...t, id: 'T-10' };
      }
      return t;
    });
    if (corrected) {
      console.log('[Sanitizer] Automatically corrected duplicate teacher "caac" ID from T-08 to T-10.');
    }
  }

  // Auto-prune system notifications older than 24 hours (86,400,000 ms) to keep the db clean every day
  if (state && typeof state === 'object' && Array.isArray(state.notifications)) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const initialCount = state.notifications.length;
    state.notifications = state.notifications.filter((n: any) => {
      if (!n || !n.timestamp) return false;
      try {
        const time = new Date(n.timestamp).getTime();
        return !isNaN(time) && time > oneDayAgo;
      } catch (e) {
        return false;
      }
    });
    if (state.notifications.length !== initialCount) {
      console.log(`[Sanitizer] Automatically pruned ${initialCount - state.notifications.length} notifications older than 24 hours.`);
    }
  }

  // Auto-translate old Somali item descriptions dynamically to guarantee standardized names during print / download
  if (state && typeof state === 'object' && Array.isArray(state.invoices)) {
    state.invoices.forEach((inv: any) => {
      if (inv && Array.isArray(inv.items)) {
        inv.items.forEach((item: any) => {
          if (item && item.description) {
            const d = item.description.trim().toLowerCase();
            if (d === 'lacagta fiiga quranka' || d === 'lacagta fiiga ee quranka' || d === "lacagta fiiga ee qur'anka" || d === 'fiiga quranka') {
              item.description = "lacagta bisha ee qur'aanka";
            } else if (d === 'lacagta fiiga higgaadda' || d === 'lacagta fiiga ee higgaadda' || d === 'lacagta fiiga ardada higgaadda' || d === 'fiiga higgaadda') {
              item.description = "lacagta bisha ee higgaadda";
            } else if (d === 'lacagta faylasha arday kasta' || d === 'faylasha lagu kaydiyo xogta ardayga' || d === 'faylasha ardayga' || d === 'faylasha' || d === 'faylalka lagu kaydiyo xogta ardayga') {
              item.description = "lacagta faylasha";
            } else if (d === 'lacagta diiwan galinta arday kasta' || d === 'lacagta diiwan-galinta arday kasta' || d === 'diiwan galinta' || d === 'diiwangelinta' || d === 'diiwan-gelinta' || d === 'diiwan galinta ardayga') {
              item.description = "lacagta diiwan galinta ardayga";
            }
          }
        });
      }
    });
  }

  // Auto-migrate old student IDs to DS001, DS002, etc. sorted by registration date
  if (state && typeof state === 'object' && Array.isArray(state.students)) {
    const hasOldIds = state.students.some((s: any) => s && s.id && s.id.startsWith('BJ-'));
    if (hasOldIds) {
      console.log('[Migration] Migrating student IDs on the fly...');
      // Sort students: ascending by registrationDate.
      // If equal, stable sort via array indices to guarantee "which one got registered first".
      const sortedStudents = [...state.students].sort((a: any, b: any) => {
        const dateA = a.registrationDate || '';
        const dateB = b.registrationDate || '';
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const indexA = state.students.indexOf(a);
        const indexB = state.students.indexOf(b);
        return indexA - indexB;
      });

      // Build ID mapping dictionary
      const idMap: Record<string, string> = {};
      sortedStudents.forEach((student: any, index: number) => {
        const oldId = student.id;
        const newId = `DS${String(index + 1).padStart(3, '0')}`;
        idMap[oldId] = newId;
        student.id = newId;
      });

      // 1. Update DailyProgress
      if (Array.isArray(state.progress)) {
        state.progress.forEach((p: any) => {
          if (p && p.studentId && idMap[p.studentId]) {
            const oldId = p.studentId;
            const newId = idMap[oldId];
            p.studentId = newId;
            if (p.id && typeof p.id === 'string') {
              p.id = p.id.replace(oldId, newId);
            }
          }
        });
      }

      // 2. Update BillingRecord
      if (Array.isArray(state.billing)) {
        state.billing.forEach((b: any) => {
          if (b && b.studentId && idMap[b.studentId]) {
            const oldId = b.studentId;
            const newId = idMap[oldId];
            b.studentId = newId;
            if (b.id && typeof b.id === 'string') {
              b.id = b.id.replace(oldId, newId);
            }
            if (b.receiptNo && typeof b.receiptNo === 'string') {
              const oldNum = oldId.replace('BJ-', '');
              const newNum = newId.replace('DS', '');
              b.receiptNo = b.receiptNo.replace(oldNum, newNum);
            }
          }
        });
      }

      // 3. Update Exam Scores
      if (Array.isArray(state.exams)) {
        state.exams.forEach((ex: any) => {
          if (ex && Array.isArray(ex.scores)) {
            ex.scores.forEach((sc: any) => {
              if (sc && sc.studentId && idMap[sc.studentId]) {
                sc.studentId = idMap[sc.studentId];
              }
            });
          }
        });
      }

      // 4. Update Invoices
      if (Array.isArray(state.invoices)) {
        state.invoices.forEach((inv: any) => {
          if (inv && inv.studentId && typeof inv.studentId === 'string') {
            Object.keys(idMap).forEach((oldId) => {
              const regex = new RegExp(oldId, 'g');
              inv.studentId = inv.studentId.replace(regex, idMap[oldId]);
            });
          }
        });
      }

      // 5. Update Teacher Submissions
      if (Array.isArray(state.submissions)) {
        state.submissions.forEach((sub: any) => {
          if (sub && Array.isArray(sub.studentsDetail)) {
            sub.studentsDetail.forEach((stud: any) => {
              if (stud && stud.studentId && idMap[stud.studentId]) {
                stud.studentId = idMap[stud.studentId];
              }
            });
          }
        });
      }

      state.students = sortedStudents;
      console.log('[Migration] Successfully migrated student IDs. Map:', idMap);
    }
  }

  // 6. Generic Sweep of any remaining old BJ- prefixes in the state to ensure DS uniformity
  if (state && typeof state === 'object') {
    const fixPrefix = (val: any): any => {
      if (typeof val === 'string') {
        return val.replace(/BJ-/g, 'DS');
      }
      return val;
    };

    if (Array.isArray(state.progress)) {
      state.progress.forEach((p: any) => {
        if (p) {
          if (p.studentId) p.studentId = fixPrefix(p.studentId);
          if (p.id) p.id = fixPrefix(p.id);
        }
      });
    }
    if (Array.isArray(state.billing)) {
      state.billing.forEach((b: any) => {
        if (b) {
          if (b.studentId) b.studentId = fixPrefix(b.studentId);
          if (b.id) b.id = fixPrefix(b.id);
        }
      });
    }
    if (Array.isArray(state.exams)) {
      state.exams.forEach((ex: any) => {
        if (ex && Array.isArray(ex.scores)) {
          ex.scores.forEach((sc: any) => {
            if (sc && sc.studentId) sc.studentId = fixPrefix(sc.studentId);
          });
        }
      });
    }
    if (Array.isArray(state.invoices)) {
      state.invoices.forEach((inv: any) => {
        if (inv) {
          if (inv.studentId) inv.studentId = fixPrefix(inv.studentId);
        }
      });
    }
    if (Array.isArray(state.submissions)) {
      state.submissions.forEach((sub: any) => {
        if (sub && Array.isArray(sub.studentsDetail)) {
          sub.studentsDetail.forEach((stud: any) => {
            if (stud && stud.studentId) stud.studentId = fixPrefix(stud.studentId);
          });
        }
      });
    }
  }

  return state;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with high limit for larger database payloads
  app.use(express.json({ limit: '50mb' }));

  // Enable CORS middleware for direct cross-origin client syncs (e.g., from Netlify dugsigasubuc.com)
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, X-User-Role, X-Teacher-Id, X-Session-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // SEO Middleware: Prevent duplicate indexing of temporary run.app and dev URLs by adding X-Robots-Tag
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.includes('run.app') || host.includes('aistudio') || !host.includes('dugsigasubuc.com')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
  });

  // Block client-side and browser caching for all /api endpoints to ensure instant multi-device sync
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // Initialize Firebase Firestore Connection
  let db: any = null;
  let stateDocRef: any = null;
  let currentDatabaseState: any = null;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const firebaseConfig = JSON.parse(configContent);
      const firebaseApp = initializeApp(firebaseConfig);
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true
      }, firebaseConfig.firestoreDatabaseId);
      stateDocRef = doc(db, 'system', 'state');
      console.log('Firebase client initialized successfully.');

      // Start real-time Firestore database synchronization
      onSnapshot(stateDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          let remoteState = (docSnap.data() as any)?.state;
          if (remoteState && typeof remoteState === 'object') {
            remoteState = sanitizeDatabaseState(remoteState);
            let mergedState = { ...remoteState };
            let changed = false;

            // Check if we have local seeds in database.json that need to be merged
            if (fs.existsSync(DB_FILE)) {
              try {
                const localContent = fs.readFileSync(DB_FILE, 'utf-8');
                let localState = JSON.parse(localContent);
                localState = sanitizeDatabaseState(localState);
                if (localState && localState.moneyTransfers && Array.isArray(localState.moneyTransfers)) {
                  if (!mergedState.moneyTransfers) {
                    mergedState.moneyTransfers = [];
                  }
                  const remoteIds = new Set(mergedState.moneyTransfers.map((m: any) => m.id));
                  const updatedTransfers = [...mergedState.moneyTransfers];
                  for (const item of localState.moneyTransfers) {
                    if (item && item.id && !remoteIds.has(item.id)) {
                      updatedTransfers.push(item);
                      remoteIds.add(item.id);
                      changed = true;
                      console.log(`[Server Sync] Merging missing money transfer record: ${item.id}`);
                    }
                  }
                  if (changed) {
                    mergedState.moneyTransfers = updatedTransfers;
                  }
                }
              } catch (parseErr) {
                console.error('[Server Sync] Fail parsing database.json for merge:', parseErr);
              }
            }

            if (changed) {
              currentDatabaseState = mergedState;
              fs.writeFileSync(DB_FILE, JSON.stringify(mergedState, null, 2), 'utf-8');
              try {
                await setDoc(stateDocRef, { state: mergedState });
                console.log('[Server Sync] Successfully wrote merged database state to Firestore.');
              } catch (writeErr) {
                console.error('[Server Sync] Fail writing merged state to Firestore:', writeErr);
              }
            } else {
              currentDatabaseState = remoteState;
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteState, null, 2), 'utf-8');
              console.log('Database state synchronized in real-time from Firestore cloud.');
            }
          }
        }
      }, (err) => {
        console.error('Error in Firestore real-time listener:', err);
      });
    } else {
      console.warn('Firebase configuration file not found. Falling back to simple file-based storage.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase database connection:', error);
  }

  // SEO Route: robots.txt
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const pPath = path.join(process.cwd(), 'public', 'robots.txt');
    const dPath = path.join(process.cwd(), 'dist', 'robots.txt');
    
    let content = '';
    if (fs.existsSync(pPath)) {
      content = fs.readFileSync(pPath, 'utf-8').trim();
    } else if (fs.existsSync(dPath)) {
      content = fs.readFileSync(dPath, 'utf-8').trim();
    } else {
      content = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.dugsigasubuc.com/sitemap.xml`;
    }
    
    res.status(200);
    return res.end(content);
  });

  // SEO Route: sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Explicitly guarantee noindex header is removed for crawling of the sitemap
    res.removeHeader('X-Robots-Tag');
    
    const pPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const dPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    
    let content = '';
    if (fs.existsSync(pPath)) {
      content = fs.readFileSync(pPath, 'utf-8').trim();
    } else if (fs.existsSync(dPath)) {
      content = fs.readFileSync(dPath, 'utf-8').trim();
    } else {
      const today = new Date().toISOString().split('T')[0];
      content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.dugsigasubuc.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.dugsigasubuc.com/#about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.dugsigasubuc.com/#contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
    }
    
    res.status(200);
    return res.end(content);
  });

  // API Route: Check Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Diagnostics & Verification Test
  app.get('/api/diagnostics', async (req, res) => {
    const diagnosticReport: any = {
      status: 'active',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: PORT,
        firebaseConfigExists: fs.existsSync(CONFIG_FILE),
        localDbFileExists: fs.existsSync(DB_FILE)
      },
      firestoreStatus: {
        initialized: !!db,
        connected: false,
        hasStateDoc: false,
        error: null
      },
      databaseState: {
        teachersCount: 0,
        teachersList: [],
        studentsCount: 0,
        moneyTransfersCount: 0
      }
    };

    let activeState = currentDatabaseState;

    if (stateDocRef) {
      try {
        const docSnap = await getDoc(stateDocRef);
        diagnosticReport.firestoreStatus.connected = true;
        if (docSnap.exists()) {
          diagnosticReport.firestoreStatus.hasStateDoc = true;
          const remoteState = (docSnap.data() as any)?.state;
          if (remoteState && typeof remoteState === 'object') {
            activeState = remoteState;
          }
        }
      } catch (fbError: any) {
        diagnosticReport.firestoreStatus.error = fbError instanceof Error ? fbError.message : String(fbError);
      }
    }

    if (activeState) {
      diagnosticReport.databaseState.teachersCount = Array.isArray(activeState.teachers) ? activeState.teachers.length : 0;
      diagnosticReport.databaseState.studentsCount = Array.isArray(activeState.students) ? activeState.students.length : 0;
      diagnosticReport.databaseState.moneyTransfersCount = Array.isArray(activeState.moneyTransfers) ? activeState.moneyTransfers.length : 0;
      
      if (Array.isArray(activeState.teachers)) {
        diagnosticReport.databaseState.teachersList = activeState.teachers.map((t: any) => ({
          id: t.id,
          name: t.name,
          username: t.username,
          password: t.passwordHash || 'N/A',
          classAssigned: t.classAssigned || t.className || 'None'
        }));
      }
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json(diagnosticReport);
  });

  // API Route: Get Database State
  app.get('/api/database', async (req, res) => {
    try {
      // 1. Always prioritize fetching the freshest direct document from Cloud Firestore to guarantee absolute real-time sync across devices
      if (stateDocRef) {
        try {
          const docSnap = await getDoc(stateDocRef);
          if (docSnap.exists()) {
            let remoteState = (docSnap.data() as any)?.state;
            if (remoteState && typeof remoteState === 'object') {
              remoteState = sanitizeDatabaseState(remoteState);
              currentDatabaseState = remoteState;
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteState, null, 2), 'utf-8');
              return res.json({ initialized: true, data: remoteState });
            }
          }
        } catch (fbError) {
          console.error('[Server API] Failed to fetch from Firestore directly, falling back to cached state:', fbError);
        }
      }

      // 2. Secondary Fallback: Serve from hot in-memory synced state
      if (currentDatabaseState) {
        currentDatabaseState = sanitizeDatabaseState(currentDatabaseState);
        return res.json({ initialized: true, data: currentDatabaseState });
      }

      // 3. Ultimate structural fallback: local database.json file
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        let dbState = JSON.parse(fileContent);
        dbState = sanitizeDatabaseState(dbState);
        currentDatabaseState = dbState;
        
        // Seed to Firestore to auto-initialize the cloud db
        if (stateDocRef && db) {
          try {
            await setDoc(stateDocRef, { state: dbState });
            console.log('Seeded Cloud Firestore with initial local dataset.');
          } catch (seedErr) {
            console.error('Failed to seed local database to Firestore:', seedErr);
          }
        }
        return res.json({ initialized: true, data: dbState });
      } else {
        return res.json({ initialized: false, message: 'Database file not initialized yet.' });
      }
    } catch (error) {
      console.error('Error resolving database state:', error);
      return res.status(500).json({ error: 'Failed to retrieve database.' });
    }
  });

  // API Route: Update Database State
  app.post('/api/database', async (req, res) => {
    try {
      let dbState = req.body;
      if (!dbState || typeof dbState !== 'object') {
        return res.status(400).json({ error: 'Invalid database payload.' });
      }
      dbState = sanitizeDatabaseState(dbState);

      // Check active sessions for protected client requests (Teacher)
      const userRole = req.headers['x-user-role'];
      const teacherId = req.headers['x-teacher-id'];
      const sessionId = req.headers['x-session-id'];

      if (userRole === 'teacher' && teacherId && sessionId) {
        if (currentDatabaseState) {
          const activeTeacher = (currentDatabaseState.teachers || []).find((t: any) => t.id === teacherId);
          if (activeTeacher && activeTeacher.currentSessionId && activeTeacher.currentSessionId !== sessionId) {
            console.warn(`[Security] Session hijacked/expired for teacher ${teacherId}. Requested: ${sessionId}, Server: ${activeTeacher.currentSessionId}`);
            return res.status(403).json({ 
              error: 'session_expired', 
              message: 'You have been logged out because your account was used on another device.' 
            });
          }
        }
      }

      // 1. Save locally in real-time
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
      currentDatabaseState = dbState;

      // 2. Synchronize to Firestore cloud
      if (stateDocRef) {
        try {
          await setDoc(stateDocRef, { state: dbState });
          console.log('Successfully saved and synced update to Firestore Cloud.');
        } catch (fbWriteErr) {
          console.error('Failed to write updates to Firestore Cloud:', fbWriteErr);
        }
      }

      return res.json({ success: true, message: 'Database synchronized successfully.', data: dbState });
    } catch (error) {
      console.error('Error persisting database state changes:', error);
      return res.status(500).json({ error: 'Failed to persist database changes.' });
    }
  });

  // Vite Middleware for Asset Serving & Hot Realloading in Dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
