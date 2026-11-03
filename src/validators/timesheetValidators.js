'use strict';

const { body, param, query } = require('express-validator');
const { DATE_RE } = require('../utils/dateUtils');

const entryRules = [
  body('entries').isArray({ min: 1 }).withMessage('Add at least one task entry'),
  body('entries.*.project').trim().notEmpty().withMessage('Project / Module is required'),
  body('entries.*.description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('entries.*.hours')
    .isFloat({ gt: 0, max: 24 })
    .withMessage('Duration must be greater than 0 and at most 24 hours'),
  body('entries.*.type')
    .optional({ nullable: true })
    .isIn(['Work', 'Permission', 'Leave'])
    .withMessage('Entry type must be Work, Permission or Leave'),
];

const createRules = [
  body('date').matches(DATE_RE).withMessage('Date must be YYYY-MM-DD'),
  body('employee').optional().isMongoId().withMessage('Invalid employee id'),
  ...entryRules,
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid timesheet id'),
  ...entryRules,
];

const listRules = [
  query('from').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('from must be YYYY-MM-DD'),
  query('to').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('to must be YYYY-MM-DD'),
  query('employee').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid employee id'),
];

module.exports = { createRules, updateRules, listRules };
