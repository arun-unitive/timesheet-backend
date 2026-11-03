'use strict';

const mongoose = require('mongoose');

/**
 * Single-document settings store (keyed by a constant `key`).
 * Holds the configurable timesheet submission rules.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'global' },
    dailyTargetHours: { type: Number, default: 8, min: 1, max: 24 },
    // How many days back an employee may still edit a timesheet.
    editWindowDays: { type: Number, default: 7, min: 0, max: 365 },
  },
  { timestamps: true }
);

/** Return the singleton settings document, creating it on first use. */
settingSchema.statics.getGlobal = async function getGlobal() {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

module.exports = mongoose.model('Setting', settingSchema);
