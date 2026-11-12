'use strict';

const mongoose = require('mongoose');
const { round2 } = require('../utils/dateUtils');

/**
 * A single task row inside a day's timesheet.
 * Duration-based: the employee picks how long the task took, never clock times.
 * (Business validation with clear messages happens in the service layer.)
 */
const entrySchema = new mongoose.Schema(
  {
    project: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    hours: { type: Number, required: true, min: 0, max: 24 },
    type: { type: String, enum: ['Work', 'Permission', 'Leave'], default: 'Work' },
  },
  { _id: true }
);

const timesheetSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    entries: { type: [entrySchema], default: [] },
    totalHours: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One timesheet per employee per calendar day.
timesheetSchema.index({ employee: 1, date: -1 }, { unique: true });
// Admin list filtering / sorting.
timesheetSchema.index({ date: -1 });
timesheetSchema.index({ employee: 1, date: -1 });

/**
 * Total working hours for a day. Permission and Leave entries are marked in the
 * grid without a description, but they still count towards the total hours.
 */
const sumWorkHours = (entries = []) =>
  round2((entries || []).reduce((sum, e) => sum + (e.hours || 0), 0));

/** Mongo aggregation expression that sums every entry's hours from `$entries`. */
const workHoursExpr = {
  $sum: {
    $sum: {
      $map: {
        input: { $ifNull: ['$entries', []] },
        as: 'entry',
        in: '$$entry.hours',
      },
    },
  },
};

/** Recompute the day total whenever the document is validated. */
timesheetSchema.pre('validate', function computeTotal(next) {
  this.totalHours = sumWorkHours(this.entries);
  next();
});

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

Timesheet.sumWorkHours = sumWorkHours;
Timesheet.workHoursExpr = workHoursExpr;

module.exports = Timesheet;
