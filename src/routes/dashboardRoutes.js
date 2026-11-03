'use strict';

const express = require('express');
const { requireAuth, isAdmin } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(requireAuth);

router.get('/admin', isAdmin, dashboardController.admin);
router.get('/employee', dashboardController.employee);

module.exports = router;
