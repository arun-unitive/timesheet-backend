'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const authService = require('../services/authService');
const settingService = require('../services/settingService');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result);
});

/** Return the authenticated user plus app settings in one round-trip. */
const me = asyncHandler(async (req, res) => {
  const settings = await settingService.getGlobal();
  return ok(res, {
    user: req.user.toPublic(),
    settings: {
      dailyTargetHours: settings.dailyTargetHours,
      editWindowDays: settings.editWindowDays,
      lockAfterApproval: settings.lockAfterApproval,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changePassword(req.user._id, req.body);
  return ok(res, { user });
});

module.exports = { login, me, changePassword };
