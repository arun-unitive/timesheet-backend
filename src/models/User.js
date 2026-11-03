'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    plainPassword: { type: String, select: false }, // Only for admin view if requested
    role: { type: String, enum: ['admin', 'employee'], default: 'employee', index: true },

    // Employee profile (optional for admins)
    employeeCode: { type: String, trim: true, uppercase: true },
    department: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    joiningDate: { type: String, default: null }, // YYYY-MM-DD

    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index that powers the common admin list filters.
userSchema.index({ role: 1, isActive: 1, name: 1 });

/** Hash the password whenever it changes. */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Shape sent to the client - never leaks the password hash. */
userSchema.methods.toPublic = function toPublic() {
  return {
    _id: this._id,
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    employeeCode: this.employeeCode,
    department: this.department,
    designation: this.designation,
    phone: this.phone,
    joiningDate: this.joiningDate,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    plainPassword: this.plainPassword,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
