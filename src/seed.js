'use strict';

/**
 * Idempotent seed script.
 * Creates the default administrator and the global settings document.
 *
 *   npm run seed
 */

const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const User = require('./models/User');
const Setting = require('./models/Setting');

async function seed() {
  await connectDatabase();

  const email = (process.env.ADMIN_EMAIL || 'admin@company.com').toLowerCase();
  const name = process.env.ADMIN_NAME || 'System Administrator';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await User.findOne({ email });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`[seed] admin already exists: ${email}`);
  } else {
    await User.create({ name, email, password, role: 'admin', isActive: true });
    // eslint-disable-next-line no-console
    console.log(`[seed] admin created: ${email} / ${password}`);
  }

  await Setting.getGlobal();
  // eslint-disable-next-line no-console
  console.log('[seed] global settings ready');
  // eslint-disable-next-line no-console
  console.log(`[seed] done (env: ${env.nodeEnv})`);
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
