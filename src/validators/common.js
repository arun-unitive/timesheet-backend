'use strict';

const { body, param, query } = require('express-validator');
const { DATE_RE } = require('../utils/dateUtils');

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const createEmployeeRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('employeeCode').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('department').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('designation').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('joiningDate')
    .optional({ nullable: true, checkFalsy: true })
    .matches(DATE_RE)
    .withMessage('Joining date must be YYYY-MM-DD'),
];

const updateEmployeeRules = [
  param('id').isMongoId().withMessage('Invalid employee id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 120 }),
  body('email').optional().trim().isEmail().withMessage('Enter a valid email'),
  body('password')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('department').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('designation').optional({ nullable: true }).trim().isLength({ max: 120 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('employeeCode').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('joiningDate')
    .optional({ nullable: true, checkFalsy: true })
    .matches(DATE_RE)
    .withMessage('Joining date must be YYYY-MM-DD'),
];

module.exports = {
  loginRules,
  changePasswordRules,
  createEmployeeRules,
  updateEmployeeRules,
  DATE_RE,
};
