'use strict';

const ApiError = require('../utils/ApiError');

/** 404 handler for unmatched routes. */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = notFound;
