'use strict';

const authService = require('../services/auth.service');
const { resolveSession } = require('../middleware/auth');
const { getGatewayIdentity, gatewayKey } = require('../middleware/gateway');
const { config } = require('../config/env');

function promisify(fn) {
  return new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));
}

// POST /api/auth/signup -> stores the user in PostgreSQL. Does NOT sign the user in.
async function signup(req, res) {
  const user = await authService.register(req.validated);
  console.log(`[auth] user registered: ${user.username} (${user.employeeId})`);
  res.status(201).json({ success: true, message: 'User registered successfully' });
}

// POST /api/auth/login -> verifies bcrypt hash and creates the EBS application session.
async function login(req, res) {
  const user = await authService.authenticate(req.validated.username, req.validated.password);

  // New session id on login (prevents session fixation).
  await promisify((cb) => req.session.regenerate(cb));
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.loginAt = new Date().toISOString();
  // Bind this EBS session to the MFA gateway user that was present at sign-in.
  req.session.gatewayUser = gatewayKey(getGatewayIdentity(req));
  await promisify((cb) => req.session.save(cb));

  console.log(`[auth] login: ${user.username} gateway=${req.session.gatewayUser || '-'}`);
  res.json({ success: true, message: 'Signed in successfully', user });
}

// POST /api/auth/logout -> destroys the application session, then hands the browser the
// gateway sign-out URL so the OAuth2 Proxy (and Keycloak) sessions are ended as well.
async function logout(req, res) {
  const username = req.session && req.session.username;
  if (req.session) await promisify((cb) => req.session.destroy(cb));
  res.clearCookie(config.session.cookieName, { path: '/' });
  if (username) console.log(`[auth] logout: ${username} (all sessions)`);
  res.json({
    success: true,
    message: 'You have been signed out successfully.',
    redirect: config.gateway.logoutUrl,
  });
}

// GET /api/auth/session -> current EBS session state (always 200).
async function session(req, res) {
  const { user, code } = await resolveSession(req);
  res.json({
    success: true,
    authenticated: Boolean(user),
    code,
    user,
    expiresAt: user && req.session.cookie.expires ? req.session.cookie.expires : null,
  });
}

module.exports = { signup, login, logout, session };
