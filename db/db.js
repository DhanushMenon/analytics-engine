// db/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('DB connected via Supavisor Session Mode (IPv4 compatible)');
});

pool.on('error', (err) => {
  console.error('DB error:', err.message);
});

module.exports = pool;