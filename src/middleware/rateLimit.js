'use strict';

// Small in-memory fixed-window rate limiter (single-instance POC; no extra dependency).
function rateLimit({ windowMs, max, key, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs).unref();

  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', message });
    }
    next();
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}|${String((req.body && req.body.username) || '').toLowerCase()}`,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  key: (req) => req.ip,
  message: 'Too many registration attempts. Please try again later.',
});

module.exports = { rateLimit, loginLimiter, signupLimiter };
