// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db/db');

// Generate API key
const generateApiKey = () => crypto.randomBytes(32).toString('hex');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new website/app and generate API key
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@example.com
 *     responses:
 *       201:
 *         description: App registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user_id:
 *                   type: integer
 *                 api_key:
 *                   type: string
 *       400:
 *         description: Invalid email
 *       500:
 *         description: Server error
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
 *     summary: Retrieve API key for registered app
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: API key retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 api_key:
 *                   type: string
 *       404:
 *         description: Not found
 */
router.get('/api-key', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await pool.query('SELECT api_key FROM users WHERE email = $1 AND revoked = FALSE', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found or revoked' });
    }
    res.json({ api_key: result.rows[0].api_key });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/revoke:
 *   post:
 *     summary: Revoke API key
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: Revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/revoke', async (req, res) => {
  const { api_key } = req.body;
  if (!api_key) return res.status(400).json({ error: 'API key required' });

  try {
    const result = await pool.query('UPDATE users SET revoked = TRUE WHERE api_key = $1 RETURNING id', [api_key]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;