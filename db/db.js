// db/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // FORCE IPv4 — CRITICAL FOR RENDER + SUPABASE
  host: process.env.DATABASE_URL.match(/@([^:]+)/)[1],
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  // Optional: Better connection handling
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Log connection success
pool.on('connect', () => {
  console.log('DB connected via IPv4');
});

pool.on('error', (err) => {
  console.error('DB pool error:', err);
});

module.exports = pool;