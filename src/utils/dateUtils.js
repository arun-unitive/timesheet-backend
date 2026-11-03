'use strict';

/**
 * All calendar dates are handled as `YYYY-MM-DD` strings so that
 * day boundaries never shift because of timezone conversions.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (value) => typeof value === 'string' && DATE_RE.test(value);

/** Convert a Date (or now) to a local `YYYY-MM-DD` string. */
const toDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Today's date string on the server. */
const today = () => toDateString(new Date());

/** Add `days` (can be negative) to a `YYYY-MM-DD` string. */
const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateString(dt);
};

/** Inclusive list of date strings between start and end. */
const dateRange = (startStr, endStr) => {
  const out = [];
  if (!isValidDateString(startStr) || !isValidDateString(endStr) || startStr > endStr) return out;
  let cursor = startStr;
  // Guard against unbounded loops on bad input.
  let guard = 0;
  while (cursor <= endStr && guard < 5000) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
};

/** Monday-based start of week for a given date string. */
const startOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  dt.setDate(dt.getDate() + diff);
  return toDateString(dt);
};

const endOfWeek = (dateStr) => addDays(startOfWeek(dateStr), 6);

const startOfMonth = (dateStr) => `${dateStr.slice(0, 7)}-01`;

const endOfMonth = (dateStr) => {
  const [y, m] = dateStr.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${dateStr.slice(0, 7)}-${String(last).padStart(2, '0')}`;
};

/** Round a number of hours to 2 decimals. */
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

module.exports = {
  DATE_RE,
  isValidDateString,
  toDateString,
  today,
  addDays,
  dateRange,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  round2,
};
