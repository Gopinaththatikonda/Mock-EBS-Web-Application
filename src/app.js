'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const { config } = require('./config/env');
const db = require('./config/database');
const { securityHeaders, requireJson, noStore, requestLogger } = require('./middleware/security');
const { requireGateway } = require('./middleware/gateway');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(securityHeaders);
app.use(requestLogger);

// ---- Health (no session, no gateway requirement) ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-ebs', port: config.port });
});

app.get('/health/db', async (req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', service: 'mock-ebs', database: 'up' });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    res.status(503).json({ status: 'error', service: 'mock-ebs', database: 'down' });
  }
});

// ---- Static assets (css/js/img only; HTML pages live in /views and are routed below) ----
// maxAge 0 = browsers revalidate via ETag, so a redeploy is visible immediately.
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: 0 }));

// ---- EBS application session (Layer 2) ----
app.use(express.json({ limit: '10kb' }));
app.use(
  session({
    store: new PgSession({
      pool: db.pool,
      tableName: 'user_sessions',
      createTableIfMissing: false, // created by migrations/002
      pruneSessionInterval: 15 * 60,
    }),
    name: config.session.cookieName,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.session.cookieSecure,
      maxAge: config.session.ttlMinutes * 60 * 1000,
      path: '/',
    },
  })
);

// ---- API ----
app.use('/api', noStore, requireJson);
app.use(['/api/auth', '/api/profile', '/api/demo', '/api/admin'], requireGateway);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/user.routes'));

// ---- Pages ----
app.use(require('./routes/page.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
