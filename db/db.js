// db/db.js
const { Pool } = require('pg');
const parse = require('pg-connection-string').parse;

let config = {};

if (process.env.DATABASE_URL) {
  config = parse(process.env.DATABASE_URL);
}

// FORCE IPv4 HOST — THIS IS THE ONLY WAY THAT WORKS
config.host = 'db.fsghlmvxfvlxtmasgimg.supabase.co';
config.ssl = {
  rejectUnauthorized: false
};

const pool = new Pool(config);

pool.on('connect', () => {
  console.log('DB connected to Supabase via IPv4 (FINAL FIX)');
});

pool.on('error', (err) => {
  console.error('DB error:', err.message);
});

module.exports = pool;