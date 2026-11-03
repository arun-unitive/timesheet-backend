'use strict';

const Leave = require('../models/Leave');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');
const { today, dateRange, addDays, round2 } = require('../utils/dateUtils');

const SORTABLE = ['startDate', 'endDate', 'createdAt', 'leaveType', 'title'];
const populateEmployee = { path: 'employee', select: 'name email employeeCode department' };

const daysBetween = (startDate, endDate) => dateRange(startDate, endDate).length || 1;

/** Visible to: admin -> everything; employee -> common leaves + their own. */
const visibilityFilter = (user) => {
  if (user.role === 'admin') return {};
  return { $or: [{ scope: 'common' }, { employee: user._id }] };
};

const buildFilter = (query, user) => {
  const filter = { ...visibilityFilter(user) };
  if (query.scope) filter.scope = query.scope;
  if (query.leaveType) filter.leaveType = query.leaveType;
  if (query.employee) filter.employee = query.employee;
  if (query.from || query.to) {
    // Overlap check: record intersects the requested window.
    const start = query.from || '0000-01-01';
    const end = query.to || '9999-12-31';
    filter.startDate = { $lte: end };
    filter.endDate = { $gte: start };
  }
  return filter;
};

const list = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query, user);
  const sort = buildSort(query, SORTABLE, { startDate: -1 });

  const [items, total] = await Promise.all([
    Leave.find(filter).sort(sort).skip(skip).limit(limit).populate(populateEmployee).lean(),
    Leave.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
};

const create = async (payload, adminUser) => {
  if (payload.endDate < payload.startDate) {
    throw ApiError.badRequest('End date cannot be before the start date');
  }

  if (payload.scope === 'individual') {
    const employee = await User.findOne({ _id: payload.employee, role: 'employee' }).lean();
    if (!employee) throw ApiError.badRequest('Selected employee does not exist', { employee: 'Invalid employee' });
  }

  const doc = await Leave.create({
    scope: payload.scope,
    leaveType: payload.leaveType,
    title: payload.title,
    description: payload.description || '',
    employee: payload.scope === 'individual' ? payload.employee : null,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days: daysBetween(payload.startDate, payload.endDate),
    reason: payload.reason || '',
    createdBy: adminUser._id,
  });

  await doc.populate(populateEmployee);
  return doc.toObject();
};

const update = async (id, payload) => {
  const doc = await Leave.findById(id);
  if (!doc) throw ApiError.notFound('Leave not found');

  ['title', 'description', 'leaveType', 'reason'].forEach((field) => {
    if (payload[field] !== undefined) doc[field] = payload[field];
  });
  if (payload.startDate) doc.startDate = payload.startDate;
  if (payload.endDate) doc.endDate = payload.endDate;
  if (doc.endDate < doc.startDate) throw ApiError.badRequest('End date cannot be before the start date');
  doc.days = daysBetween(doc.startDate, doc.endDate);

  await doc.save();
  await doc.populate(populateEmployee);
  return doc.toObject();
};

const remove = async (id) => {
  const doc = await Leave.findById(id);
  if (!doc) throw ApiError.notFound('Leave not found');
  await doc.deleteOne();
  return { id };
};

/** Upcoming holidays / leaves visible to the employee (from today forward). */
const upcoming = async (user, withinDays = 90) => {
  const from = today();
  const to = addDays(from, withinDays);
  return Leave.find({
    ...visibilityFilter(user),
    endDate: { $gte: from },
    startDate: { $lte: to },
  })
    .sort({ startDate: 1 })
    .limit(20)
    .populate(populateEmployee)
    .lean();
};

/** Employee's own leave history + comp-off balance. */
const myLeaves = async (user) => {
  const leaves = await Leave.find({ employee: user._id }).sort({ startDate: -1 }).lean();
  const compOff = leaves.filter((l) => l.leaveType === 'comp-off');
  return {
    leaves,
    compOff: {
      balanceDays: round2(compOff.reduce((sum, l) => sum + l.days, 0)),
      records: compOff,
    },
  };
};

/** Employee ids that have an (individual) leave covering the given date. */
const employeesOnLeaveIds = async (date) => {
  const docs = await Leave.find({
    scope: 'individual',
    startDate: { $lte: date },
    endDate: { $gte: date },
  })
    .select('employee')
    .lean();
  return docs.map((d) => d.employee).filter(Boolean);
};

/**
 * The leave record covering this employee on this date, if any.
 * Covers organisation-wide holidays (scope 'common') as well as leaves and
 * comp-offs granted to the employee personally (scope 'individual').
 */
const leaveOnDate = async (employeeId, date) =>
  Leave.findOne({
    startDate: { $lte: date },
    endDate: { $gte: date },
    $or: [{ scope: 'common' }, { scope: 'individual', employee: employeeId }],
  }).lean();

module.exports = {
  list,
  create,
  update,
  remove,
  upcoming,
  myLeaves,
  employeesOnLeaveIds,
  leaveOnDate,
  views: { buildFilter },
};
