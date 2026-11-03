'use strict';

const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Called once on server bootstrap.
 * Fails fast so the process does not run without a database.
 */
async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log(`[db] connected -> ${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[db] connection error', err.message);
    });

    return mongoose.connection;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] unable to connect', err.message);
    throw err;
  }
}

module.exports = { connectDatabase };
