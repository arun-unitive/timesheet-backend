'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const settingService = require('../services/settingService');
const dashboardService = require('../services/dashboardService');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.getGlobal();
  return ok(res, {
    dailyTargetHours: settings.dailyTargetHours,
    editWindowDays: settings.editWindowDays,
    lockAfterApproval: settings.lockAfterApproval,
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.update(req.body);
  return ok(res, settings);
});

const admin = asyncHandler(async (req, res) => {
  const data = await dashboardService.adminDashboard({ month: req.query.month });
  return ok(res, data);
});

const employee = asyncHandler(async (req, res) => {
  const data = await dashboardService.employeeDashboard(req.user);
  return ok(res, data);
});

module.exports = { getSettings, updateSettings, admin, employee };
