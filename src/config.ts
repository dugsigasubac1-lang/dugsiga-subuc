// Configuration for API Base Routing
// Automatically endpoints are proxied if hosted on AI Studio / Local Dev,
// otherwise points directly to Cloud Run microservice to avoid custom domain rewrite issues.

export const API_BASE = (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('run.app') ||
  window.location.hostname.includes('aistudio')
)
  ? ''
  : 'https://ais-pre-62d2s5mys67lzy355x45ja-697605956028.europe-west2.run.app';

console.info(`[Dugsiga Subuc] Unified API Base Route connected to: "${API_BASE || 'Relative (local)'}"`);
