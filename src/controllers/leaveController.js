'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const leaveService = require('../services/leaveService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await leaveService.list(req.query, req.user);
  return ok(res, items, meta);
});

const upcoming = asyncHandler(async (req, res) => {
  const items = await leaveService.upcoming(req.user, Number(req.query.days) || 90);
  return ok(res, items);
});

const mine = asyncHandler(async (req, res) => {
  const data = await leaveService.myLeaves(req.user);
  return ok(res, data);
});

const create = asyncHandler(async (req, res) => {
  const doc = await leaveService.create(req.body, req.user);
  return created(res, doc);
});

const update = asyncHandler(async (req, res) => {
  const doc = await leaveService.update(req.params.id, req.body);
  return ok(res, doc);
});

const remove = asyncHandler(async (req, res) => {
  const result = await leaveService.remove(req.params.id);
  return ok(res, result);
});

module.exports = { list, upcoming, mine, create, update, remove };
