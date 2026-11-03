'use strict';

const User = require('../models/User');
const Timesheet = require('../models/Timesheet');
const Leave = require('../models/Leave');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');

const SORTABLE = ['name', 'email', 'createdAt', 'designation', 'department'];

/** Escape user text used inside a regex search. */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFilter = ({ search, status, department }) => {
  const filter = { role: 'employee' };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (department) filter.department = department;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { employeeCode: rx }, { designation: rx }];
  }
  return filter;
};

/** Paginated employee list for the admin table. */
const list = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildFilter(query);
  const sort = buildSort(query, SORTABLE, { createdAt: -1 });

  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).select('+plainPassword').lean({ virtuals: false }),
    User.countDocuments(filter),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
};

/** Lightweight list used to populate employee selectors. */
const options = async () => {
  const items = await User.find({ role: 'employee' }).select('name email employeeCode isActive').sort({ name: 1 }).lean();
  return items;
};

const getById = async (id) => {
  const user = await User.findOne({ _id: id, role: 'employee' }).select('+plainPassword');
  if (!user) throw ApiError.notFound('Employee not found');
  return user.toPublic();
};

const create = async (payload) => {
  const email = String(payload.email).toLowerCase().trim();
  const exists = await User.findOne({ email }).lean();
  if (exists) throw ApiError.conflict('An account with this email already exists', { email: 'Email already in use' });

  const user = await User.create({
    name: payload.name,
    email,
    password: payload.password,
    plainPassword: payload.password, // Store plain password for admin view
    role: 'employee',
    employeeCode: payload.employeeCode || undefined,
    department: payload.department || '',
    designation: payload.designation || '',
    phone: payload.phone || '',
    joiningDate: payload.joiningDate || null,
    isActive: true,
  });

  return user.toPublic();
};

const update = async (id, payload) => {
  const user = await User.findOne({ _id: id, role: 'employee' }).select('+password +plainPassword');
  if (!user) throw ApiError.notFound('Employee not found');

  if (payload.email) {
    const email = String(payload.email).toLowerCase().trim();
    if (email !== user.email) {
      const clash = await User.findOne({ email, _id: { $ne: user._id } }).lean();
      if (clash) throw ApiError.conflict('An account with this email already exists', { email: 'Email already in use' });
      user.email = email;
    }
  }

  ['name', 'department', 'designation', 'phone', 'employeeCode'].forEach((field) => {
    if (payload[field] !== undefined) user[field] = payload[field];
  });
  if (payload.joiningDate !== undefined) user.joiningDate = payload.joiningDate || null;
  // Only overwrite the password when a new one was supplied.
  if (payload.password) {
    user.password = payload.password;
    user.plainPassword = payload.password;
  }

  await user.save();
  return user.toPublic();
};

/** Activate / deactivate an employee. */
const setActive = async (id, isActive) => {
  const user = await User.findOneAndUpdate(
    { _id: id, role: 'employee' },
    { $set: { isActive: Boolean(isActive) } },
    { new: true }
  );
  if (!user) throw ApiError.notFound('Employee not found');
  return user.toPublic();
};

/** Permanently remove an employee together with their timesheets and leaves. */
const remove = async (id) => {
  const user = await User.findOne({ _id: id, role: 'employee' });
  if (!user) throw ApiError.notFound('Employee not found');

  await Promise.all([
    Timesheet.deleteMany({ employee: user._id }),
    Leave.deleteMany({ employee: user._id }),
    user.deleteOne(),
  ]);
  return { id };
};

module.exports = { list, options, getById, create, update, setActive, remove, escapeRegex };
