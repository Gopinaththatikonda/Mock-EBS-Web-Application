'use strict';

const express = require('express');
const ctrl = require('../controllers/user.controller');
const demo = require('../controllers/demo.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Existing endpoint (gateway identity), now also reports the EBS session separately.
router.get('/user', ctrl.currentUser);

// Everything below requires an EBS application session.
router.get('/profile', requireAuth, ctrl.profile);

router.get('/demo/summary', requireAuth, demo.getSummary);
router.get('/demo/track/:serviceNo', requireAuth, demo.trackService);
router.get('/demo/:dataset', requireAuth, demo.listDataset);

router.get('/admin/users', requireAuth, requireRole('admin'), ctrl.listUsers);

module.exports = router;
