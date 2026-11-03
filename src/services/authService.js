'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../middleware/auth');

/** Authenticate by email + password and return a token + public user. */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact your administrator.');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { token: signToken(user), user: user.toPublic() };
};

/** Change the current user's password after verifying the old one. */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const matches = await user.comparePassword(currentPassword);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  await user.save();
  return user.toPublic();
};

module.exports = { login, changePassword };
