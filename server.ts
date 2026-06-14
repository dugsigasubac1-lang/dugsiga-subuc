import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const DB_FILE = path.join(process.cwd(), 'database.json');
const CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with high limit for larger database payloads
  app.use(express.json({ limit: '50mb' }));

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
          const remoteState = (docSnap.data() as any)?.state;
          if (remoteState && typeof remoteState === 'object') {
            let mergedState = { ...remoteState };
            let changed = false;

            // Check if we have local seeds in database.json that need to be merged
            if (fs.existsSync(DB_FILE)) {
              try {
                const localContent = fs.readFileSync(DB_FILE, 'utf-8');
                const localState = JSON.parse(localContent);
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
    res.header('Content-Type', 'text/plain');
    res.send(
      `User-agent: *\n` +
      `Allow: /\n` +
      `Disallow: /api/\n\n` +
      `Sitemap: https://dugsigasubuc.com/sitemap.xml`
    );
  });

  // SEO Route: sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    const today = new Date().toISOString().split('T')[0];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dugsigasubuc.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.send(sitemap);
  });

  // API Route: Check Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Get Database State
  app.get('/api/database', async (req, res) => {
    try {
      // 1. Try to serve from the hot in-memory synced state from Firestore (extremely fast, 0ms)
      if (currentDatabaseState) {
        return res.json({ initialized: true, data: currentDatabaseState });
      }

      // 2. Fallback to direct Firestore getDoc (if listener hasn't fired or during quick bootup)
      if (stateDocRef) {
        try {
          const docSnap = await getDoc(stateDocRef);
          if (docSnap.exists()) {
            const remoteState = (docSnap.data() as any)?.state;
            if (remoteState && typeof remoteState === 'object') {
              currentDatabaseState = remoteState;
              fs.writeFileSync(DB_FILE, JSON.stringify(remoteState, null, 2), 'utf-8');
              return res.json({ initialized: true, data: remoteState });
            }
          }
        } catch (fbError) {
          console.error('Failed to fetch from Firestore directly, falling back to local file:', fbError);
        }
      }

      // 3. Ultimate structural fallback: local database.json file
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const dbState = JSON.parse(fileContent);
        // Seed to Firestore to auto-initialize the cloud db
        if (stateDocRef && db) {
          try {
            await setDoc(stateDocRef, { state: dbState });
            currentDatabaseState = dbState;
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
      const dbState = req.body;
      if (!dbState || typeof dbState !== 'object') {
        return res.status(400).json({ error: 'Invalid database payload.' });
      }

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
    
    // Serve static files with proper control rules
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        const relativePath = path.relative(distPath, filePath);
        
        // Don't cache HTML files
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
        } 
        // Cache hashed assets aggressively
        else if (
          relativePath.startsWith('assets' + path.sep) ||
          filePath.endsWith('.js') || 
          filePath.endsWith('.css') ||
          filePath.endsWith('.woff') ||
          filePath.endsWith('.woff2') ||
          filePath.endsWith('.svg') ||
          filePath.endsWith('.png') ||
          filePath.endsWith('.jpg') ||
          filePath.endsWith('.jpeg') ||
          filePath.endsWith('.ico')
        ) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } 
        // Fallback for any non-hashed static file
        else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
