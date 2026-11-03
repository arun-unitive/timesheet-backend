'use strict';

const { body } = require('express-validator');

const updateScheduleRules = [
  body('dailyTargetHours')
    .optional()
    .isFloat({ min: 1, max: 24 })
    .withMessage('Daily target hours must be between 1 and 24'),
  body('editWindowDays')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Edit window must be between 0 and 365 days'),
  body('lockAfterApproval').optional().isBoolean().withMessage('lockAfterApproval must be a boolean'),
];

module.exports = { updateScheduleRules };
