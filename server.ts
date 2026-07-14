import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";


const DB_FILE = path.join(process.cwd(), 'database.json');
const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

let s3Client: S3Client | null = null;
let bucketInitialized = false;

function getR2Client(): S3Client | null {
  if (s3Client) return s3Client;

  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.log("[R2] Cloudflare R2 environment variables are missing. Falling back to local storage only.");
    return null;
  }

  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
    console.log("[R2] Cloudflare R2 S3 Client initialized successfully.");
    return s3Client;
  } catch (err) {
    console.error("[R2] Failed to initialize Cloudflare R2 S3 Client:", err);
    return null;
  }
}

async function ensureBucketExists(client: S3Client, bucketName: string): Promise<boolean> {
  if (bucketInitialized) return true;
  try {
    const listResponse = await client.send(new ListBucketsCommand({}));
    const buckets = listResponse.Buckets || [];
    const exists = buckets.some(b => b.Name === bucketName);
    
    if (!exists) {
      console.log(`[R2] Bucket "${bucketName}" not found. Creating bucket...`);
      await client.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`[R2] Bucket "${bucketName}" created successfully.`);
    }
    bucketInitialized = true;
    return true;
  } catch (err: any) {
    if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
      bucketInitialized = true;
      return true;
    }
    console.warn(`[R2] Warning or error checking bucket "${bucketName}":`, err.message || err);
    bucketInitialized = true;
    return true;
  }
}


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
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Use JSON middleware with high limit for larger database payloads
  app.use(express.json({ limit: '50mb' }));

  const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    try {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    } catch (err) {
      console.error('Failed to create uploads directory:', err);
    }
  }

  // Intercept uploads requested from the client. Retrieve from Cloudflare R2 if possible, or fallback to local files
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    const r2 = getR2Client();
    if (r2) {
      const bucketName = process.env.R2_BUCKET_NAME || 'dugsiga-subuc-storage';
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: filename,
        });
        const r2Object = await r2.send(command);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        if (r2Object.ContentType) {
          res.setHeader('Content-Type', r2Object.ContentType);
        }
        if (r2Object.ContentLength) {
          res.setHeader('Content-Length', r2Object.ContentLength);
        }
        
        if (r2Object.Body) {
          const stream = r2Object.Body as any;
          stream.pipe(res);
          return;
        }
      } catch (r2Err: any) {
        // Fall through to local static folder if file is not in R2 or bucket error occurs
        console.log(`[R2/Serve] File "${filename}" not retrieved from R2, falling back to local filesystem:`, r2Err.message || r2Err);
      }
    }
    next();
  });

  app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }));

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
    const host = (req.get('host') || '').toLowerCase();
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

  let resolveFirstSnapshot: () => void = () => {};
  const firstSnapshotPromise = new Promise<void>((resolve) => {
    resolveFirstSnapshot = resolve;
  });
  let isSnapshotLoaded = false;

  try {
    let firebaseConfig: any = null;
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
      firebaseConfig = JSON.parse(configContent);
      console.log('Firebase configured using firebase-applet-config.json file.');
    } else if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || "",
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-4ff514b8-ec83-4143-b156-7acce5ac27d5",
      };
      console.log('Firebase configured using environment variables.');
    } else if (process.env.FIREBASE_CONFIG) {
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        console.log('Firebase configured using FIREBASE_CONFIG JSON environment variable.');
      } catch (e: any) {
        console.error('Failed to parse FIREBASE_CONFIG environment variable:', e.message || e);
      }
    }

    if (firebaseConfig) {
      const firebaseApp = initializeApp(firebaseConfig);
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true
      }, firebaseConfig.firestoreDatabaseId);
      stateDocRef = doc(db, 'system', 'state');
      console.log('Firebase client initialized successfully.');

      // Start real-time Firestore database synchronization
      onSnapshot(stateDocRef, async (docSnap) => {
        try {
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
        } catch (syncErr) {
          console.error('[Server Sync] Error resolving sync snapshot:', syncErr);
        } finally {
          if (!isSnapshotLoaded) {
            isSnapshotLoaded = true;
            resolveFirstSnapshot();
          }
        }
      }, (err) => {
        console.error('Error in Firestore real-time listener:', err);
        if (!isSnapshotLoaded) {
          isSnapshotLoaded = true;
          resolveFirstSnapshot();
        }
      });
    } else {
      console.warn('Firebase configuration (JSON file or environment variables) not found. Falling back to simple file-based storage.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase database connection:', error);
  }

  // SEO Route: robots.txt
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.removeHeader('X-Robots-Tag');
    
    const pPath = path.join(process.cwd(), 'public', 'robots.txt');
    const dPath = path.join(process.cwd(), 'dist', 'robots.txt');
    
    let content = '';
    if (fs.existsSync(pPath)) {
      content = fs.readFileSync(pPath, 'utf-8').trim();
    } else if (fs.existsSync(dPath)) {
      content = fs.readFileSync(dPath, 'utf-8').trim();
    } else {
      content = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://dugsigasubuc.com/sitemap.xml`;
    }
    
    res.status(200);
    return res.end(content);
  });

  // SEO Route: sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    
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
    <loc>https://dugsigasubuc.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://dugsigasubuc.com/#about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://dugsigasubuc.com/#contact</loc>
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
      // Wait for the Firestore snapshot listener to have completed its first fetch attempt
      if (stateDocRef && !isSnapshotLoaded) {
        console.log('[Server API] Waiting for Firestore snapshot initialization...');
        await Promise.race([
          firstSnapshotPromise,
          new Promise(resolve => setTimeout(resolve, 3000)) // 3-second safeguard timeout
        ]);
      }

      // 1. Primary path: Serve from hot in-memory synced state (kept up-to-date in real-time by onSnapshot)
      // This is extremely fast (1-2ms), respects Firebase Quotas, and avoids slow blocking Firestore getDoc calls on every client poll.
      if (currentDatabaseState) {
        currentDatabaseState = sanitizeDatabaseState(currentDatabaseState);
        return res.json({ initialized: true, data: currentDatabaseState });
      }

      // 2. Secondary Fallback: Fetch direct document from Cloud Firestore if memory state is not populated yet
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
          console.error('[Server API] Failed to fetch from Firestore directly:', fbError);
        }
      }

      // 3. Ultimate structural fallback: local database.json file
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        let dbState = JSON.parse(fileContent);
        dbState = sanitizeDatabaseState(dbState);
        currentDatabaseState = dbState;
        
        // Seed to Firestore to auto-initialize the cloud db ONLY if stateDocRef is available AND we are sure Firestore has no existing state doc
        if (stateDocRef && db) {
          try {
            // Re-verify if Firestore doc exists before seeding to prevent overwriting existing remote records
            const checkSnap = await getDoc(stateDocRef);
            if (!checkSnap.exists()) {
              await setDoc(stateDocRef, { state: dbState });
              console.log('Seeded Cloud Firestore with initial local dataset (since remote doc was non-existent).');
            } else {
              const remoteState = (checkSnap.data() as any)?.state;
              if (remoteState) {
                currentDatabaseState = remoteState;
                fs.writeFileSync(DB_FILE, JSON.stringify(remoteState, null, 2), 'utf-8');
                console.log('Successfully recovered remote Firestore dataset on startup fallback check.');
                return res.json({ initialized: true, data: remoteState });
              }
            }
          } catch (seedErr) {
            console.error('Failed to safely check/seed local database to Firestore:', seedErr);
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

  // API Route: Handle Student and general Media upload files (Compressed images, voice audio recordings, and videos)
  app.post('/api/upload', async (req, res) => {
    try {
      const { filename, fileType, fileData } = req.body;
      if (!filename || !fileData) {
        return res.status(400).json({ error: 'Sida saxda ah u soo dir file-ka (Missing filename or fileData).' });
      }

      // Extract raw base64 data, ignoring any data url scheme descriptor
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filePath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      
      console.log(`[Storage/Upload] Successfully wrote ${filename} to server local uploads: ${buffer.length} bytes`);
      
      // Attempt uploading to Cloudflare R2 if configured
      const r2 = getR2Client();
      if (r2) {
        const bucketName = process.env.R2_BUCKET_NAME || 'dugsiga-subuc-storage';
        try {
          await ensureBucketExists(r2, bucketName);
          await r2.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: fileType || 'application/octet-stream',
          }));
          console.log(`[R2/Upload] Successfully uploaded ${filename} to Cloudflare R2 bucket: ${bucketName}`);
        } catch (r2Err: any) {
          console.error(`[R2/Upload] Failed to upload to Cloudflare R2, falling back to local only:`, r2Err.message || r2Err);
        }
      } else {
        console.log(`[Storage/Upload] Cloudflare R2 not configured. Saving locally only.`);
      }

      // Use relative path which works across localhost, proxy, and custom domains
      const fileUrl = `/uploads/${filename}`;
      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error('[Storage/Upload] Failure writing upload:', err);
      return res.status(500).json({ error: 'Ma calaqan karo file-ka (Failed to write upload to server filesystem).' });
    }
  });

  // Treat as production mode if NODE_ENV is 'production', OR if running from the compiled 'dist/server.cjs' bundle, OR if source files are missing
  const isProdMode = process.env.NODE_ENV === 'production' || 
                      (typeof __filename !== 'undefined' && (__filename.includes('dist') || __filename.endsWith('.cjs'))) ||
                      !fs.existsSync(path.join(process.cwd(), 'server.ts'));

  // Vite Middleware for Asset Serving & Hot Reloading in Dev
  if (!isProdMode) {
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
    
    // Start self-pinging background service (Keep-Alive Pinger) to prevent Render sleep
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;
    if (externalUrl) {
      console.log(`[Keep-Alive] Initializing self-pinger for public URL: ${externalUrl}`);
      // Self-ping immediately to confirm initialization
      const healthUrl = `${externalUrl.replace(/\/$/, '')}/api/health`;
      fetch(healthUrl)
        .then(res => res.json())
        .then(data => console.log('[Keep-Alive] Initial connection verification succeeded:', data))
        .catch(err => console.warn('[Keep-Alive] Initial self-ping check failed (server may still be starting up):', err.message || err));

      // Schedule subsequent pings every 10 minutes (600,000 ms)
      setInterval(async () => {
        try {
          const response = await fetch(healthUrl);
          const data = await response.json();
          console.log(`[Keep-Alive] Successfully self-pinged at ${new Date().toISOString()}:`, data);
        } catch (pingError: any) {
          console.error('[Keep-Alive] Self-ping interval failed:', pingError.message || pingError);
        }
      }, 10 * 60 * 1000);
    } else {
      console.log('[Keep-Alive] RENDER_EXTERNAL_URL or PUBLIC_URL is not set. Self-pinger is disabled.');
    }
  });
}

startServer();
