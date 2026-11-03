'use strict';

/**
 * Consistent, lightweight response envelope for every endpoint.
 * Keeps payloads small (no wrapping metadata unless paginated).
 */
const ok = (res, data, meta) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(200).json(body);
};

const created = (res, data, meta) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(201).json(body);
};

module.exports = { ok, created };
