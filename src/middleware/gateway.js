'use strict';

/*
 * Layer 1 - MFA gateway identity.
 * OAuth2 Proxy (after Keycloak username/password + TOTP) forwards the user's identity in
 * request headers (--pass-user-headers / --set-xauthrequest). The EBS app only READS this
 * identity; it never creates an EBS session from it.
 */
const { config } = require('../config/env');

function parseGroups(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((g) => g.trim().replace(/^\//, '')) // Keycloak may send full group paths ("/EBS_ACCESS")
    .filter(Boolean);
}

function getGatewayIdentity(req) {
  const username =
    req.get('X-Auth-Request-Preferred-Username') ||
    req.get('X-Forwarded-Preferred-Username') ||
    req.get('X-Auth-Request-User') ||
    req.get('X-Forwarded-User') ||
    null;
  const email = req.get('X-Auth-Request-Email') || req.get('X-Forwarded-Email') || null;
  const groups = parseGroups(req.get('X-Auth-Request-Groups') || req.get('X-Forwarded-Groups'));

  return {
    authenticated: Boolean(username || email),
    username,
    email,
    groups,
  };
}

// Stable key used to bind an EBS session to the gateway user who created it.
function gatewayKey(identity) {
  return identity.authenticated ? String(identity.email || identity.username).toLowerCase() : null;
}

// Optional enforcement (disabled by default). Primary enforcement stays in OAuth2 Proxy.
function requireGateway(req, res, next) {
  const { requireAuth, requiredGroup } = config.gateway;
  if (!requireAuth && !requiredGroup) return next();

  const identity = getGatewayIdentity(req);
  if (!identity.authenticated) {
    return res.status(401).json({
      success: false,
      code: 'GATEWAY_REQUIRED',
      message: 'Access is only permitted through the APSRTC MFA gateway.',
    });
  }
  if (requiredGroup && !identity.groups.includes(requiredGroup)) {
    return res.status(403).json({
      success: false,
      code: 'GATEWAY_GROUP_REQUIRED',
      message: 'Your account is not authorised for EBS access. Please contact the administrator.',
    });
  }
  next();
}

module.exports = { getGatewayIdentity, gatewayKey, requireGateway };
