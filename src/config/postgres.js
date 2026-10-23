// PostgreSQL Connection Pool & Schema Migration Manager
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./env');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000
});

async function initPostgresSchema() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  return true;
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initPostgresSchema
};
