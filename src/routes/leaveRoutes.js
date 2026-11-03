'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth, isAdmin } = require('../middleware/auth');
const { createRules, updateRules, listRules } = require('../validators/leaveValidators');
const leaveController = require('../controllers/leaveController');

const router = express.Router();

router.use(requireAuth);

// Employee-accessible reads.
router.get('/', listRules, validate, leaveController.list);
router.get('/upcoming', leaveController.upcoming);
router.get('/mine', leaveController.mine);

// Admin-only management.
router.post('/', isAdmin, createRules, validate, leaveController.create);
router.put('/:id', isAdmin, updateRules, validate, leaveController.update);
router.delete('/:id', isAdmin, leaveController.remove);

module.exports = router;
