'use strict';

const path = require('path');
const express = require('express');

const PORT = parseInt(process.env.PORT, 10) || 8081;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
app.disable('x-powered-by');

// Simple request logger: timestamp, method, path, status, duration, user.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const user = getUser(req);
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ` +
        `${res.statusCode} ${Date.now() - start}ms user=${user.email || user.username || '-'}`
    );
  });
  next();
});

// Read the identity headers set by OAuth2 Proxy (--set-xauthrequest / --pass-user-headers).
function getUser(req) {
  const username =
    req.get('X-Auth-Request-Preferred-Username') ||
    req.get('X-Forwarded-Preferred-Username') ||
    req.get('X-Auth-Request-User') ||
    req.get('X-Forwarded-User') ||
    null;
  const email = req.get('X-Auth-Request-Email') || req.get('X-Forwarded-Email') || null;

  return {
    authenticated: Boolean(username || email),
    username,
    email,
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-ebs', port: PORT });
});

app.get('/api/user', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(getUser(req));
});

// Frontend pages. The demo signup/login (localStorage) and route guarding happen in the
// browser; real authentication is enforced upstream by OAuth2 Proxy + Keycloak.
const PUBLIC_DIR = path.join(__dirname, 'public');

app.get('/signup', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'signup.html'));
});

app.get(['/dashboard', '/accounts', '/transactions', '/profile'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

app.use(express.static(PUBLIC_DIR));

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

const server = app.listen(PORT, HOST, () => {
  console.log('========================================');
  console.log(' Mock EBS Application');
  console.log('========================================');
  console.log(` Server: http://${HOST}:${PORT}`);
  console.log(` Environment: ${NODE_ENV}`);
  console.log('========================================');
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
