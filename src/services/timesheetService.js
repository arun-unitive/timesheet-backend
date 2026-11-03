'use strict';

const Timesheet = require('../models/Timesheet');
const Setting = require('../models/Setting');
const leaveService = require('./leaveService');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');
const { today, addDays, round2, isValidDateString } = require('../utils/dateUtils');

const SORTABLE = ['date', 'totalHours', 'createdAt', 'updatedAt'];

const MAX_ENTRY_HOURS = 24;
const ENTRY_TYPES = ['Work', 'Permission', 'Leave'];
const LEAVE_LOCK_MESSAGE = 'Timesheet entries are not allowed on leave days.';

const populateEmployee = { path: 'employee', select: 'name email employeeCode department designation' };

/**
 * Reads always report Work-only hours, so records saved before the
 * "Permission/Leave are not working hours" rule stay consistent.
 */
const withWorkHours = (ts) => (ts ? { ...ts, totalHours: Timesheet.sumWorkHours(ts.entries) } : ts);

/** Build the filter used by both admin and employee list endpoints. */
const buildFilter = (query, user) => {
  const filter = {};
  if (user.role === 'employee') {
    filter.employee = user._id;
  } else if (query.employee) {
    filter.employee = query.employee;
  }
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = query.from;
    if (query.to) filter.date.$lte = query.to;
  }
  return filter;
};

/** Paginated list with server-side filtering and sorting. */
const list = async (query, user) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query, user);
  const sort = buildSort(query, SORTABLE, { date: -1 });

  const [items, total] = await Promise.all([
    Timesheet.find(filter).sort(sort).skip(skip).limit(limit).populate(populateEmployee).lean(),
    Timesheet.countDocuments(filter),
  ]);

  return { items: items.map(withWorkHours), meta: buildMeta(total, page, limit) };
};

/** Ownership guard: employees may only read or write their own records. */
const assertAccess = (timesheet, user) => {
  if (user.role === 'employee' && String(timesheet.employee._id || timesheet.employee) !== String(user._id)) {
    throw ApiError.forbidden('You cannot access another employee\'s timesheet');
  }
};

const getById = async (id, user) => {
  const doc = await Timesheet.findById(id).populate(populateEmployee);
  if (!doc) throw ApiError.notFound('Timesheet not found');
  assertAccess(doc, user);
  return withWorkHours(doc.toObject());
};

const getByDate = async (employeeId, date) =>
  withWorkHours(await Timesheet.findOne({ employee: employeeId, date }).populate(populateEmployee).lean());

/** Business rule: is an employee allowed to modify this timesheet now? */
const assertEditable = async (timesheet, settings) => {
  const earliest = addDays(today(), -settings.editWindowDays);
  if (timesheet.date < earliest) {
    throw ApiError.forbidden(
      `The edit window for this date has closed (${settings.editWindowDays} day limit)`
    );
  }
  if (timesheet.date > today()) {
    throw ApiError.forbidden('You cannot log hours for a future date');
  }
};

/**
 * Validate + normalise entries. Hours come from the duration the employee
 * chose, and are always re-validated on the server.
 */
const normalizeEntries = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw ApiError.badRequest('Add at least one task entry');
  }
  return entries.map((entry, index) => {
    const project = String(entry.project || '').trim();
    if (!project) {
      throw ApiError.badRequest(`Project / Module is required for entry ${index + 1}`);
    }
    const hours = round2(entry.hours);
    if (hours <= 0) {
      throw ApiError.badRequest(`Entry ${index + 1}: duration must be greater than 0 hours`);
    }
    if (hours > MAX_ENTRY_HOURS) {
      throw ApiError.badRequest(`Entry ${index + 1}: duration cannot exceed ${MAX_ENTRY_HOURS} hours`);
    }
    return {
      project,
      description: String(entry.description || '').trim(),
      hours,
      type: ENTRY_TYPES.includes(entry.type) ? entry.type : 'Work',
    };
  });
};

/**
 * Leave guard: an employee on approved leave (a common holiday, a personal
 * leave or a comp-off) cannot create or update timesheet entries for that day.
 */
const assertNotOnLeave = async (employeeId, date) => {
  const leave = await leaveService.leaveOnDate(employeeId, date);
  if (leave) throw ApiError.forbidden(LEAVE_LOCK_MESSAGE);
};

/** Validate that the payload date is sane. */
const assertDate = (date) => {
  if (!isValidDateString(date)) throw ApiError.badRequest('Date must be YYYY-MM-DD');
  if (date > today()) throw ApiError.badRequest('You cannot log hours for a future date');
};

/**
 * Create or replace the caller's timesheet for a given date.
 * The unique (employee, date) index guarantees a single record per day.
 */
const upsertDay = async (user, { date, entries, employee }) => {
  const settings = await Setting.getGlobal();
  const targetEmployeeId = user.role === 'admin' && employee ? employee : user._id;
  assertDate(date);
  const normalized = normalizeEntries(entries);

  let doc = await Timesheet.findOne({ employee: targetEmployeeId, date });

  if (doc) {
    if (String(targetEmployeeId) === String(user._id)) await assertEditable(doc, settings);
    doc.entries = normalized;
  } else {
    doc = new Timesheet({ employee: targetEmployeeId, date, entries: normalized });
  }

  await doc.save();
  await doc.populate(populateEmployee);
  return doc.toObject();
};

/** Update an existing timesheet's entries (employee only, respects the edit window). */
const update = async (id, user, { entries }) => {
  const doc = await Timesheet.findById(id);
  if (!doc) throw ApiError.notFound('Timesheet not found');
  assertAccess(doc, user);

  const settings = await Setting.getGlobal();
  await assertEditable(doc, settings);

  doc.entries = normalizeEntries(entries);

  await doc.save();
  await doc.populate(populateEmployee);
  return doc.toObject();
};

const remove = async (id, user) => {
  const doc = await Timesheet.findById(id);
  if (!doc) throw ApiError.notFound('Timesheet not found');
  assertAccess(doc, user);

  if (user.role === 'employee') {
    const settings = await Setting.getGlobal();
    await assertEditable(doc, settings);
  }

  await doc.deleteOne();
  return { id };
};

/**
 * Aggregated per-day totals for a date range - used by the daily/weekly/monthly
 * views so the client never has to stitch together raw rows.
 */
const summary = async (query, user) => {
  const filter = buildFilter(query, user);
  if (!filter.date) {
    const from = query.from || addDays(today(), -30);
    filter.date = { $gte: from, $lte: query.to || today() };
  }

  const rows = await Timesheet.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$date',
        totalHours: Timesheet.workHoursExpr,
        entries: { $sum: { $size: '$entries' } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        totalHours: { $round: ['$totalHours', 2] },
        entries: 1,
      },
    },
  ]);

  const grandTotal = round2(rows.reduce((sum, r) => sum + r.totalHours, 0));
  return { days: rows, totalHours: grandTotal, workingDays: rows.length };
};

/** Today's timesheet for the current employee (or a specific employee for admins). */
const todayFor = async (user, employeeId) => {
  const targetId = user.role === 'admin' && employeeId ? employeeId : user._id;
  const doc = await Timesheet.findOne({ employee: targetId, date: today() })
    .populate(populateEmployee)
    .lean();
  return withWorkHours(doc);
};

/** Distinct projects used by an employee - powers the project autocomplete. */
const projectSuggestions = async (user) => {
  const scope = user.role === 'employee' ? { employee: user._id } : {};
  const values = await Timesheet.distinct('entries.project', scope);
  return values.filter(Boolean).sort((a, b) => a.localeCompare(b)).slice(0, 50);
};

module.exports = {
  list,
  getById,
  getByDate,
  upsertDay,
  update,
  remove,
  summary,
  todayFor,
  projectSuggestions,
};
