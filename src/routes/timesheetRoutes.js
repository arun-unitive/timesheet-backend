'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, isAdmin } = require('../middleware/auth');
const { createRules, updateRules, listRules } = require('../validators/timesheetValidators');
const timesheetController = require('../controllers/timesheetController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listRules, validate, timesheetController.list);
router.get('/summary', listRules, validate, timesheetController.summary);
router.get('/today', timesheetController.today);
router.get('/projects', timesheetController.projects);
router.post('/', createRules, validate, timesheetController.upsert);
router.get('/:id', timesheetController.getOne);
router.put('/:id', updateRules, validate, timesheetController.update);
router.delete('/:id', timesheetController.remove);

module.exports = router;
