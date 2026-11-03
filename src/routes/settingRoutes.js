'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, isAdmin } = require('../middleware/auth');
const { updateScheduleRules } = require('../validators/settingValidators');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(requireAuth);

router.get('/', dashboardController.getSettings);
router.put('/', isAdmin, updateScheduleRules, validate, dashboardController.updateSettings);

module.exports = router;
