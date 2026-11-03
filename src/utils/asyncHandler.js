'use strict';

/**
 * Wraps an async route handler so rejected promises reach the error middleware
 * without repeating try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
