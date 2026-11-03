'use strict';

const User = require('../models/User');
const Timesheet = require('../models/Timesheet');
const Leave = require('../models/Leave');
const leaveService = require('./leaveService');
const settingService = require('./settingService');
const {
  today,
  addDays,
  round2,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  dateRange,
} = require('../utils/dateUtils');

const TREND_DAYS = 14;
const MONTH_RE = /^\d{4}-\d{2}$/;

/** Sum of Work hours inside an inclusive date range (optionally per employee). */
const sumHours = async (from, to, employeeId) => {
  const match = { date: { $gte: from, $lte: to } };
  if (employeeId) match.employee = employeeId;
  const [row] = await Timesheet.aggregate([
    { $match: match },
    { $group: { _id: null, hours: Timesheet.workHoursExpr } },
  ]);
  return round2(row?.hours || 0);
};

/** Per-day Work-hour totals for the trailing `days` window (fills missing days with 0). */
const dailyTrend = async (days, employeeId) => {
  const from = addDays(today(), -(days - 1));
  const match = { date: { $gte: from, $lte: today() } };
  if (employeeId) match.employee = employeeId;

  const rows = await Timesheet.aggregate([
    { $match: match },
    { $group: { _id: '$date', hours: Timesheet.workHoursExpr } },
  ]);
  const map = new Map(rows.map((r) => [r._id, round2(r.hours)]));

  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today(), -i);
    out.push({ date, hours: map.get(date) || 0 });
  }
  return out;
};

/**
 * Days the given employees did not update their timesheet within the month.
 * A day counts as missed only when the employee was expected to work:
 * on/after their joining date, not on a common holiday, not on a personal
 * leave, and with no timesheet record for that day.
 */
const computeMissedUpdates = ({ employees, sheets, leaves, monthStart, monthEnd, ref }) => {
  const rangeEnd = monthEnd < ref ? monthEnd : ref;
  const days = dateRange(monthStart, rangeEnd);

  const commonDates = new Set();
  const individualKeys = new Set();
  leaves.forEach((leave) => {
    dateRange(leave.startDate, leave.endDate).forEach((day) => {
      if (leave.scope === 'common') commonDates.add(day);
      else if (leave.employee) individualKeys.add(`${day}::${String(leave.employee)}`);
    });
  });

  const sheetKeys = new Set(sheets.map((s) => `${s.date}::${String(s.employee)}`));

  const result = [];
  employees.forEach((emp) => {
    const id = String(emp._id);
    const joined = emp.joiningDate || null;
    let missedDays = 0;
    days.forEach((day) => {
      if (joined && day < joined) return;
      if (commonDates.has(day)) return;
      if (individualKeys.has(`${day}::${id}`)) return;
      if (sheetKeys.has(`${day}::${id}`)) return;
      missedDays += 1;
    });
    if (missedDays > 0) {
      result.push({ id, name: emp.name, department: emp.department || '', missedDays });
    }
  });

  result.sort((a, b) => b.missedDays - a.missedDays || a.name.localeCompare(b.name));
  return result;
};

/** Admin analytics payload for the dashboard, optionally scoped to a month. */
const adminDashboard = async ({ month } = {}) => {
  const settings = await settingService.getGlobal();
  const target = settings.dailyTargetHours;
  const t = today();
  const weekStart = startOfWeek(t);

  // Selected month (YYYY-MM); defaults to the current month.
  const monthKey = MONTH_RE.test(month || '') ? month : t.slice(0, 7);
  const monthStart = `${monthKey}-01`;
  const monthEnd = endOfMonth(monthStart);
  const trendEnd = monthEnd < t ? monthEnd : t;

  const [
    totalEmployees,
    activeEmployees,
    onLeaveIds,
    todaySheets,
    weekHours,
    monthHours,
    trendRows,
    departmentRows,
    topPerformers,
    activeEmployeeDocs,
    monthSheets,
    monthLeaves,
  ] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    User.countDocuments({ role: 'employee', isActive: true }),
    leaveService.employeesOnLeaveIds(t),
    Timesheet.aggregate([
      { $match: { date: t } },
      { $group: { _id: '$employee', hours: Timesheet.workHoursExpr } },
      { $project: { _id: 1, hours: { $round: ['$hours', 2] } } },
    ]),
    sumHours(weekStart, t),
    sumHours(monthStart, monthEnd),
    Timesheet.aggregate([
      { $match: { date: { $gte: monthStart, $lte: trendEnd } } },
      { $group: { _id: '$date', hours: Timesheet.workHoursExpr } },
    ]),
    Timesheet.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$employee', hours: Timesheet.workHoursExpr } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $group: { _id: '$user.department', hours: { $sum: '$hours' } } },
      { $sort: { hours: -1 } },
      { $limit: 8 },
      { $project: { _id: 0, department: { $ifNull: ['$_id', 'Unassigned'] }, hours: { $round: ['$hours', 2] } } },
    ]),
    Timesheet.aggregate([
      { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$employee', hours: Timesheet.workHoursExpr } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.isActive': true } },
      { $sort: { hours: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: '$user.name',
          department: '$user.department',
          hours: { $round: ['$hours', 2] },
        },
      },
    ]),
    User.find({ role: 'employee', isActive: true }).select('name department joiningDate').lean(),
    Timesheet.find({ date: { $gte: monthStart, $lte: monthEnd } }).select('employee date').lean(),
    Leave.find({ startDate: { $lte: monthEnd }, endDate: { $gte: monthStart } })
      .select('scope employee startDate endDate')
      .lean(),
  ]);

  // Fill a row for every day of the month up to today so the chart is continuous.
  const trendMap = new Map(trendRows.map((r) => [r._id, round2(r.hours)]));
  const dailyTrendRows = dateRange(monthStart, trendEnd).map((date) => ({
    date,
    hours: trendMap.get(date) || 0,
  }));

  const loggedIds = new Set(todaySheets.map((r) => String(r._id)));
  const onLeaveSet = new Set(onLeaveIds.map(String));

  const completedToday = todaySheets.filter((r) => r.hours >= target).length;
  const lessThanToday = todaySheets.filter((r) => r.hours > 0 && r.hours < target).length;
  const todayHours = round2(todaySheets.reduce((sum, r) => sum + r.hours, 0));

  const notUpdatedToday = activeEmployeeDocs.filter(
    (u) => !loggedIds.has(String(u._id)) && !onLeaveSet.has(String(u._id))
  ).length;

  const missedUpdates = computeMissedUpdates({
    employees: activeEmployeeDocs,
    sheets: monthSheets,
    leaves: monthLeaves,
    monthStart,
    monthEnd,
    ref: t,
  });

  return {
    month: monthKey,
    cards: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees: totalEmployees - activeEmployees,
      notUpdatedToday,
      completedToday,
      lessThanToday,
      onLeaveToday: onLeaveIds.length,
      todayHours,
      weeklyHours: weekHours,
      monthlyHours: monthHours,
      dailyTargetHours: target,
    },
    dailyTrend: dailyTrendRows,
    departmentHours: departmentRows,
    topPerformers,
    missedUpdates,
  };
};

/** Employee analytics payload for the dashboard. */
const employeeDashboard = async (user) => {
  const settings = await settingService.getGlobal();
  const target = settings.dailyTargetHours;
  const t = today();
  const weekStart = startOfWeek(t);
  const monthStart = startOfMonth(t);
  const monthEnd = endOfMonth(t);

  const [todaySheet, weekHours, monthHours, trend, recent, holidays, myLeavesData] = await Promise.all([
    Timesheet.findOne({ employee: user._id, date: t }).lean(),
    sumHours(weekStart, t, user._id),
    sumHours(monthStart, monthEnd, user._id),
    dailyTrend(TREND_DAYS, user._id),
    Timesheet.find({ employee: user._id }).sort({ date: -1 }).limit(5).lean(),
    leaveService.upcoming(user, 90),
    leaveService.myLeaves(user),
  ]);

  const todayHours = Timesheet.sumWorkHours(todaySheet?.entries);

  return {
    today: {
      date: t,
      hours: todayHours,
      target,
      remaining: round2(Math.max(0, target - todayHours)),
      hasEntry: Boolean(todaySheet),
      entries: todaySheet?.entries || [],
      timesheetId: todaySheet?._id || null,
    },
    weeklyHours: weekHours,
    monthlyHours: monthHours,
    recent: recent.map((r) => ({
      id: r._id,
      date: r.date,
      totalHours: Timesheet.sumWorkHours(r.entries),
      entries: r.entries.length,
    })),
    dailyTrend: trend,
    upcomingHolidays: holidays.filter((h) => h.scope === 'common'),
    upcomingLeaves: holidays.filter((h) => h.scope === 'individual'),
    compOff: {
      balanceDays: myLeavesData.compOff.balanceDays,
      records: myLeavesData.compOff.records.slice(0, 5),
    },
  };
};

module.exports = { adminDashboard, employeeDashboard };
