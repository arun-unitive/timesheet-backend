'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const employeeService = require('../services/employeeService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await employeeService.list(req.query);
  return ok(res, items, meta);
});

const options = asyncHandler(async (req, res) => {
  const items = await employeeService.options();
  return ok(res, items);
});

const getOne = asyncHandler(async (req, res) => {
  const employee = await employeeService.getById(req.params.id);
  return ok(res, employee);
});

const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.create(req.body);
  return created(res, employee);
});

const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.update(req.params.id, req.body);
  return ok(res, employee);
});

const setStatus = asyncHandler(async (req, res) => {
  const employee = await employeeService.setActive(req.params.id, req.body.isActive);
  return ok(res, employee);
});

const remove = asyncHandler(async (req, res) => {
  const result = await employeeService.remove(req.params.id);
  return ok(res, result);
});

module.exports = { list, options, getOne, create, update, setStatus, remove };
