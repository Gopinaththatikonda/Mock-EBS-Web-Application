'use strict';

const User = require('../models/user');
const { resolveSession } = require('../middleware/auth');
const { getGatewayIdentity } = require('../middleware/gateway');

/*
 * GET /api/user
 * Backward compatible: the top-level { authenticated, username, email } fields still describe
 * the OAuth2 Proxy (MFA gateway) identity exactly as before. The EBS application session is
 * reported separately under "ebs" so the two security layers stay distinguishable.
 */
async function currentUser(req, res) {
  const gateway = getGatewayIdentity(req);
  const { user } = await resolveSession(req);

  res.json({
    authenticated: gateway.authenticated,
    username: gateway.username,
    email: gateway.email,
    groups: gateway.groups,
    ebs: {
      authenticated: Boolean(user),
      user,
    },
  });
}

// GET /api/profile (EBS session required)
async function profile(req, res) {
  res.json({
    success: true,
    user: req.user,
    gateway: getGatewayIdentity(req),
    session: {
      loginAt: req.session.loginAt || null,
      expiresAt: req.session.cookie.expires || null,
    },
  });
}

// GET /api/admin/users (EBS session + admin role required). Real data from PostgreSQL.
async function listUsers(req, res) {
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const search = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
  const { total, items } = await User.list({ limit: pageSize, offset: (page - 1) * pageSize, search });
  res.json({ success: true, demo: false, source: 'postgresql', page, pageSize, total, items });
}

module.exports = { currentUser, profile, listUsers };
