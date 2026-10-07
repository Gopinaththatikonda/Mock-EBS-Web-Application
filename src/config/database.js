'use strict';

const { Pool } = require('pg');
const { config } = require('./env');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

function query(text, params) {
  return pool.query(text, params);
}

async function ping() {
  await pool.query('SELECT 1');
}

// Wait for PostgreSQL to accept connections (e.g. while its container is starting).
async function waitForDatabase({ attempts = 15, delayMs = 2000 } = {}) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await ping();
      return;
    } catch (err) {
      console.warn(`[db] not ready (attempt ${i}/${attempts}): ${err.message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = { pool, query, ping, waitForDatabase };
