// middleware/auth.js
const pool = require('../db/db');

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key header required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, revoked FROM users WHERE api_key = $1',
      [apiKey]
    );

    if (result.rows.length === 0 || result.rows[0].revoked) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    req.user = result.rows[0]; // Attach user to request
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateApiKey };