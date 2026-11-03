'use strict';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse pagination/sort query params with safe bounds so a client cannot
 * request an unbounded dataset.
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build meta object returned alongside paginated lists.
 */
const buildMeta = (total, page, limit) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

/**
 * Convert a white-listed sort field + order into a Mongoose sort object.
 * Falls back to the provided default to avoid sorting on unindexed/unknown fields.
 */
const buildSort = (query = {}, allowedFields = [], defaultSort = { createdAt: -1 }) => {
  const field = allowedFields.includes(query.sortBy) ? query.sortBy : null;
  if (!field) return defaultSort;
  const order = String(query.order).toLowerCase() === 'asc' ? 1 : -1;
  return { [field]: order };
};

module.exports = { parsePagination, buildMeta, buildSort, DEFAULT_LIMIT, MAX_LIMIT };
