'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  // mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/timesheet_db'),
  mongoUri: required('MONGODB_URI', 'mongodb+srv://arununitive_db_user:yJZAJO4ABcsfAXx9@cluster0.upa19nt.mongodb.net/?compressors=zlib'),
  jwtSecret: required('JWT_SECRET', 'dev_secret_change_me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  clientOrigin: process.env.CLIENT_ORIGIN || 'https://timesheet-frontend-livid.vercel.app',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;
