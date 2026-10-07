'use strict';

const fs = require('fs');
const path = require('path');

// Load .env when running outside Docker. Variables already set in the environment win.
const ENV_FILE = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(ENV_FILE) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(ENV_FILE);
}

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const config = {
  nodeEnv: NODE_ENV,
  isProduction,
  host: process.env.HOST || '0.0.0.0',
  port: int(process.env.PORT, 8090),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: int(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME || 'ebs',
    user: process.env.DB_USER || 'ebs_user',
    password: process.env.DB_PASSWORD || '',
    ssl: bool(process.env.DB_SSL, false),
  },

  session: {
    secret: process.env.SESSION_SECRET || '',
    cookieName: process.env.SESSION_COOKIE_NAME || 'ebs.sid',
    // Idle timeout; the session is extended on each request (rolling).
    ttlMinutes: int(process.env.SESSION_TTL_MINUTES, 30),
    // Set to true when users reach Nginx over HTTPS.
    cookieSecure: bool(process.env.COOKIE_SECURE, false),
  },

  gateway: {
    // When true, EBS APIs reject requests that did not come through OAuth2 Proxy
    // (no X-Forwarded-User / X-Auth-Request-* identity headers).
    requireAuth: bool(process.env.REQUIRE_GATEWAY_AUTH, false),
    // Optional defence-in-depth group check (e.g. EBS_ACCESS). Primary enforcement
    // belongs in OAuth2 Proxy (--allowed-group). Empty = disabled.
    requiredGroup: (process.env.REQUIRED_GATEWAY_GROUP || '').trim(),
    // Where the browser goes after Logout to end the OAuth2 Proxy (and Keycloak) session too.
    // OAuth2 Proxy handles /oauth2/sign_out; with --backend-logout-url it also ends the Keycloak session.
    logoutUrl: process.env.GATEWAY_LOGOUT_URL || '/oauth2/sign_out?rd=%2F',
  },

  // Comma-separated proxy list for Express "trust proxy" (client IPs for logs/rate limiting).
  trustProxy: process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal',
};

function validate() {
  const problems = [];
  if (!config.db.password) problems.push('DB_PASSWORD is not set');
  if (!config.session.secret) problems.push('SESSION_SECRET is not set');
  else if (isProduction && (config.session.secret.length < 32 || /change_?me|your_session_secret/i.test(config.session.secret))) {
    problems.push('SESSION_SECRET must be a random value of at least 32 characters in production');
  }
  if ([8080, 8081].includes(config.port)) problems.push(`PORT ${config.port} is reserved; use 8090`);
  return problems;
}

module.exports = { config, validate };
