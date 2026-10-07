'use strict';

/*
 * Layer 2 - EBS application session (server-side, PostgreSQL-backed, HTTP-only cookie).
 * Created only by POST /api/auth/login, never by the gateway identity.
 */
const User = require('../models/user');
const { config } = require('../config/env');
const { getGatewayIdentity, gatewayKey } = require('./gateway');

function hadSessionCookie(req) {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').some((c) => c.trim().startsWith(config.session.cookieName + '='));
}

function destroy(req) {
  return new Promise((resolve) => req.session.destroy(() => resolve()));
}

// Resolves the EBS user for this request, or a reason why there is none.
async function resolveSession(req) {
  const userId = req.session && req.session.userId;
  if (!userId) {
    return { user: null, code: hadSessionCookie(req) ? 'SESSION_EXPIRED' : 'UNAUTHENTICATED' };
  }

  // If the MFA gateway user changed (another Keycloak user in this browser), drop the EBS session.
  const current = gatewayKey(getGatewayIdentity(req));
  if (req.session.gatewayUser && current && current !== req.session.gatewayUser) {
    await destroy(req);
    return { user: null, code: 'SESSION_INVALIDATED' };
  }

  const user = await User.findById(userId);
  if (!user || user.status !== 'active') {
    await destroy(req);
    return { user: null, code: 'SESSION_INVALIDATED' };
  }
  return { user, code: null };
}

const MESSAGES = {
  UNAUTHENTICATED: 'Please sign in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  SESSION_INVALIDATED: 'Your session is no longer valid. Please sign in again.',
};

// API guard: 401 JSON when there is no valid EBS session.
async function requireAuth(req, res, next) {
  try {
    const { user, code } = await resolveSession(req);
    if (!user) {
      return res.status(401).json({ success: false, code, message: MESSAGES[code] });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Page guard: redirect to the EBS login page when there is no valid EBS session.
async function requirePageSession(req, res, next) {
  try {
    const { user, code } = await resolveSession(req);
    if (!user) {
      const reason = code === 'UNAUTHENTICATED' ? '' : `&reason=${code === 'SESSION_EXPIRED' ? 'expired' : 'invalid'}`;
      return res.redirect(302, `/?next=${encodeURIComponent(req.path)}${reason}`);
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Authorisation guard (use after requireAuth).
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this section.',
      });
    }
    next();
  };
}

module.exports = { resolveSession, requireAuth, requirePageSession, requireRole };
