'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after an express-validator chain and converts failures into a single
 * 400 response with a field -> message map.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = {};
  result.array().forEach((err) => {
    if (!errors[err.path]) errors[err.path] = err.msg;
  });

  const first = result.array()[0];
  return next(ApiError.badRequest(first.msg, errors));
};

module.exports = validate;
