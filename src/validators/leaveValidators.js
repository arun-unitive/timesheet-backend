'use strict';

const { body, param, query } = require('express-validator');
const { DATE_RE } = require('../utils/dateUtils');
const { LEAVE_TYPES, LEAVE_SCOPES } = require('../models/Leave');

const createRules = [
  body('scope').isIn(LEAVE_SCOPES).withMessage('Scope must be common or individual'),
  body('leaveType').isIn(LEAVE_TYPES).withMessage('Invalid leave type'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('startDate').matches(DATE_RE).withMessage('Start date must be YYYY-MM-DD'),
  body('endDate').matches(DATE_RE).withMessage('End date must be YYYY-MM-DD'),
  body('employee')
    .if(body('scope').equals('individual'))
    .isMongoId()
    .withMessage('Select an employee for an individual leave'),
  body('employee').if(body('scope').equals('common')).optional({ nullable: true }),
  body('reason').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid leave id'),
  body('title').optional().trim().notEmpty().isLength({ max: 150 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('leaveType').optional().isIn(LEAVE_TYPES).withMessage('Invalid leave type'),
  body('startDate').optional().matches(DATE_RE).withMessage('Start date must be YYYY-MM-DD'),
  body('endDate').optional().matches(DATE_RE).withMessage('End date must be YYYY-MM-DD'),
  body('reason').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

const listRules = [
  query('scope').optional({ checkFalsy: true }).isIn(LEAVE_SCOPES),
  query('leaveType').optional({ checkFalsy: true }).isIn(LEAVE_TYPES),
  query('employee').optional({ checkFalsy: true }).isMongoId(),
  query('from').optional({ checkFalsy: true }).matches(DATE_RE),
  query('to').optional({ checkFalsy: true }).matches(DATE_RE),
];

module.exports = { createRules, updateRules, listRules };
