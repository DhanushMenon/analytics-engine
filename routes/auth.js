const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db/db');

const generateApiKey = () => crypto.randomBytes(32).toString('hex');

router.post('/register', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const check = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const apiKey = generateApiKey();
    const result = await pool.query(
      'INSERT INTO users (email, api_key, created_at, revoked) VALUES ($1, $2, NOW(), FALSE) RETURNING id',
      [email, apiKey]
    );

    res.status(201).json({
      message: 'Registered successfully',
      user_id: result.rows[0].id,
      api_key: apiKey
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;