'use strict';

const { getGatewayIdentity } = require('./gateway');

// Baseline security headers. All scripts/styles are same-origin files (no inline code).
function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; " +
      "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
}

/*
 * CSRF / CORS: the app is same-origin only (no CORS headers are ever sent). State-changing
 * API calls must be JSON, which a cross-site HTML form cannot send, and a cross-site
 * fetch with JSON triggers a CORS preflight that this server does not approve.
 */
function requireJson(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Requests must be sent as JSON.' });
  }
  next();
}

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const gw = getGatewayIdentity(req);
    const ebs = req.user ? req.user.username : (req.session && req.session.username) || '-';
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ` +
        `${Date.now() - start}ms gateway=${gw.email || gw.username || '-'} ebs=${ebs}`
    );
  });
  next();
}

module.exports = { securityHeaders, requireJson, noStore, requestLogger };
