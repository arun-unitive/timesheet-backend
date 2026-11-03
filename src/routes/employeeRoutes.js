'use strict';

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, isAdmin } = require('../middleware/auth');
const { createEmployeeRules, updateEmployeeRules } = require('../validators/common');
const employeeController = require('../controllers/employeeController');

const router = express.Router();

// Every employee-management route is admin only.
router.use(requireAuth, isAdmin);

router.get('/', employeeController.list);
router.get('/options', employeeController.options);
router.post('/', createEmployeeRules, validate, employeeController.create);
router.get('/:id', employeeController.getOne);
router.put('/:id', updateEmployeeRules, validate, employeeController.update);
router.patch(
  '/:id/status',
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  validate,
  employeeController.setStatus
);
router.delete('/:id', employeeController.remove);

module.exports = router;
