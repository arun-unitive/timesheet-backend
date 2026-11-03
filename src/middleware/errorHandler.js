'use strict';

const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Central error handler. Normalises Mongoose/JWT errors into the same
 * `{ success, message, errors }` shape the frontend expects.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors;

  // Duplicate key (e.g. one timesheet per employee/day, unique email)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'record';
    if (field === 'email') message = 'An account with this email already exists';
    else if (field === 'date' || err.keyPattern?.employee) {
      message = 'A timesheet already exists for this employee on this date';
    } else {
      message = `A record with this ${field} already exists`;
    }
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    status = 400;
    errors = {};
    Object.values(err.errors || {}).forEach((e) => {
      errors[e.path] = e.message;
    });
    message = 'Please correct the highlighted fields';
  }

  // Invalid ObjectId
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }

  if (!err.isOperational && status === 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (!env.isProd && status === 500) body.stack = err.stack;

  res.status(status).json(body);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
