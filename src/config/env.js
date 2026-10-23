// Environment Configuration Loader (dotenv)
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// Generate ephemeral runtime secret if not provided via .env (no hardcoded secret literal)
const runtimeSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

module.exports = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_DIALECT: process.env.DB_DIALECT || 'embedded',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neeraj_pharma_healthcare',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/neeraj_pharma_healthcare',
  DB_FILE: path.resolve(process.cwd(), process.env.DB_FILE || './data/hospital_locator_db.json'),
  JWT_SECRET: runtimeSecret,
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
  DEFAULT_RADIUS_KM: parseFloat(process.env.DEFAULT_RADIUS_KM || '25'),
  MAX_SEARCH_RADIUS_KM: parseFloat(process.env.MAX_SEARCH_RADIUS_KM || '100')
};
