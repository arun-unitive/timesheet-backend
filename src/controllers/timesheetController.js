'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const timesheetService = require('../services/timesheetService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await timesheetService.list(req.query, req.user);
  return ok(res, items, meta);
});

const summary = asyncHandler(async (req, res) => {
  const data = await timesheetService.summary(req.query, req.user);
  return ok(res, data);
});

const today = asyncHandler(async (req, res) => {
  const doc = await timesheetService.todayFor(req.user, req.query.employee);
  return ok(res, doc);
});

const projects = asyncHandler(async (req, res) => {
  const items = await timesheetService.projectSuggestions(req.user);
  return ok(res, items);
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await timesheetService.getById(req.params.id, req.user);
  return ok(res, doc);
});

const upsert = asyncHandler(async (req, res) => {
  const doc = await timesheetService.upsertDay(req.user, req.body);
  return created(res, doc);
});

const update = asyncHandler(async (req, res) => {
  const doc = await timesheetService.update(req.params.id, req.user, req.body);
  return ok(res, doc);
});

const remove = asyncHandler(async (req, res) => {
  const result = await timesheetService.remove(req.params.id, req.user);
  return ok(res, result);
});

module.exports = { list, summary, today, projects, getOne, upsert, update, remove };
