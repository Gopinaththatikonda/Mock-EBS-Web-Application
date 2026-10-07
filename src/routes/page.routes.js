'use strict';

const path = require('path');
const express = require('express');
const { resolveSession, requirePageSession } = require('../middleware/auth');

const VIEWS = path.join(__dirname, '..', '..', 'views');
const router = express.Router();

// Portal pages (all rendered by the same shell; protected by the EBS session).
const APP_PAGES = [
  '/home', '/dashboard', '/services', '/operations', '/employees',
  '/reports', '/track-service', '/grievance', '/administration', '/profile',
];

function safeNext(value) {
  return typeof value === 'string' && APP_PAGES.includes(value) ? value : '/dashboard';
}

// Public pages: if an EBS session already exists, go straight to the portal.
function publicPage(file) {
  return async (req, res, next) => {
    try {
      const { user } = await resolveSession(req);
      if (user) return res.redirect(302, safeNext(req.query.next));
      res.set('Cache-Control', 'no-store');
      res.sendFile(file, { root: VIEWS });
    } catch (err) {
      next(err);
    }
  };
}

router.get('/', publicPage('login.html'));
router.get('/login', (req, res) => res.redirect(301, '/'));
router.get('/signup', publicPage('signup.html'));
router.get('/forgot-password', (req, res) => res.sendFile('forgot-password.html', { root: VIEWS }));

router.get(APP_PAGES, requirePageSession, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile('app.html', { root: VIEWS });
});

module.exports = router;
