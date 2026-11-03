'use strict';

const Setting = require('../models/Setting');

const getGlobal = () => Setting.getGlobal();

/** Update the singleton settings document. */
const update = async (payload) => {
  const settings = await Setting.getGlobal();
  ['dailyTargetHours', 'editWindowDays'].forEach((field) => {
    if (payload[field] !== undefined) settings[field] = payload[field];
  });
  await settings.save();
  return settings.toObject();
};

module.exports = { getGlobal, update };
