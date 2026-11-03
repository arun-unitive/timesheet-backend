'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/** Sign a JWT for a user document. */
const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

/**
 * Verify the bearer token and attach the live user document to `req.user`.
 * The user is re-read from the database so deactivated accounts lose access
 * immediately instead of waiting for the token to expire.
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing authentication token');

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      throw ApiError.unauthorized('Session expired or token is invalid');
    }

    const user = await User.findById(payload.id);
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

/** Restrict a route to one or more roles. Use after requireAuth. */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have access to this resource'));
    }
    return next();
  };

const isAdmin = requireRole('admin');

module.exports = { signToken, requireAuth, requireRole, isAdmin };
