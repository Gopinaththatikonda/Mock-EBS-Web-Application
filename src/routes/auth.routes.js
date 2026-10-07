'use strict';

const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { validateSignup, validateLogin } = require('../middleware/validation');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/signup', signupLimiter, validateSignup, ctrl.signup);
router.post('/login', loginLimiter, validateLogin, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/session', ctrl.session);

module.exports = router;
