// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db/db');
const { authenticateApiKey } = require('../middleware/auth');

// Generate API key
const generateApiKey = () => crypto.randomBytes(32).toString('hex');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register app and get API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registered successfully
 */
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

/**
 * @swagger
 * /api/auth/api-key:
 *   get:
 *     summary: Get current API key
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: API key retrieved
 */
router.get('/api-key', authenticateApiKey, (req, res) => {
  res.json({ api_key: req.user.api_key });
});

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke API key
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Key revoked
 */
router.post('/revoke', authenticateApiKey, async (req, res) => {
  try {
    await pool.query('UPDATE users SET revoked = TRUE WHERE id = $1', [req.user.id]);
    res.json({ message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke' });
  }
});

module.exports = router;