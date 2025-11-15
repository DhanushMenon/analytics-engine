// db/db.js
const { Pool } = require('pg');
const url = require('url');

let connectionString = process.env.DATABASE_URL;

// Parse URL and force IPv4
if (connectionString) {
  const parsed = url.parse(connectionString);
  const host = parsed.hostname;

  // Force IPv4 by overriding host (Supabase gives IPv4 hostname)
  connectionString = connectionString.replace(host, 'db.fsghlmvxfvlxtmasgimg.supabase.co');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  // Force IPv4 explicitly
  host: 'db.fsghlmvxfvlxtmasgimg.supabase.co',
  port: 5432,
  // Optional: better logging
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('connect', () => {
  console.log('DB connected to Supabase (IPv4)');
});

pool.on('error', (err) => {
  console.error('DB connection error:', err.message);
});

module.exports = pool;