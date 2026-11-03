'use strict';

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const timesheetRoutes = require('./timesheetRoutes');
const leaveRoutes = require('./leaveRoutes');
const settingRoutes = require('./settingRoutes');
const dashboardRoutes = require('./dashboardRoutes');

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } }));

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/timesheets', timesheetRoutes);
router.use('/leaves', leaveRoutes);
router.use('/settings', settingRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
