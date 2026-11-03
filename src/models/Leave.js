'use strict';

const mongoose = require('mongoose');

/**
 * Leave / holiday record.
 *
 * scope:
 *   - 'common'     -> organisation-wide holiday, visible to everyone (employee = null)
 *   - 'individual' -> granted to a single employee (comp-off, sick, etc.)
 *
 * A comp-off is simply an individual leave with leaveType 'comp-off'.
 */
const LEAVE_TYPES = ['holiday', 'casual', 'sick', 'earned', 'comp-off', 'unpaid', 'other'];
const LEAVE_SCOPES = ['common', 'individual'];

const leaveSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: LEAVE_SCOPES, required: true, index: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: { type: String, required: true }, // YYYY-MM-DD (inclusive)
    days: { type: Number, default: 1, min: 1 },
    reason: { type: String, trim: true, default: '', maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Fast "which employees are on leave today" and calendar range queries.
leaveSchema.index({ scope: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ employee: 1, startDate: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
module.exports.LEAVE_TYPES = LEAVE_TYPES;
module.exports.LEAVE_SCOPES = LEAVE_SCOPES;
