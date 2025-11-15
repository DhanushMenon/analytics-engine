// routes/analytics.js
const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { authenticateApiKey } = require('../middleware/auth');

const rateLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
const rateLimit = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many requests' }));
};

/**
 * @swagger
 * /api/analytics/collect:
 *   post:
 *     summary: Collect analytics event
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               url:
 *                 type: string
 *               referrer:
 *                 type: string
 *               device:
 *                 type: string
 *               ipAddress:
 *                 type: string
 *               timestamp:
 *                 type: string
 *               metadata:
 *                 type: object
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event collected
 */
router.post('/collect', rateLimit, authenticateApiKey, async (req, res) => {
  const {
    event, url, referrer, device, ipAddress,
    timestamp = new Date().toISOString(),
    metadata = {}, userId
  } = req.body;

  if (!event) return res.status(400).json({ error: 'event is required' });

  try {
    await pool.query(
      `INSERT INTO events 
       (app_id, event_type, url, referrer, device, ip_address, timestamp, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.id, event, url || null, referrer || null,
        device || null, ipAddress || null, timestamp,
        JSON.stringify(metadata), userId || null
      ]
    );
    res.status(201).json({ message: 'Event collected' });
  } catch (err) {
    console.error('Collect error:', err);
    res.status(500).json({ error: 'Failed to save event' });
  }
});

/**
 * @swagger
 * /api/analytics/event-summary:
 *   get:
 *     summary: Get event summary
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: event
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: app_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event summary
 */
router.get('/event-summary', authenticateApiKey, async (req, res) => {
  const { event, startDate, endDate, app_id } = req.query;
  if (!event) return res.status(400).json({ error: 'event query param required' });

  let query = `SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as "uniqueUsers" FROM events WHERE event_type = $1 AND app_id = $2`;
  let params = [event, parseInt(req.user.id)];

  if (app_id) {
    query = query.replace('app_id = $2', 'app_id = $3');
    params = [event, parseInt(app_id)];
  }
  if (startDate) {
    query += ` AND timestamp >= $${params.length + 1}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND timestamp <= $${params.length + 1}`;
    params.push(endDate);
  }

  try {
    const result = await pool.query(query, params);
    const deviceQuery = `SELECT device, COUNT(*) as count FROM events WHERE event_type = $1 AND app_id = $2 GROUP BY device`;
    const deviceParams = app_id ? [event, parseInt(app_id)] : [event, parseInt(req.user.id)];
    const deviceResult = await pool.query(deviceQuery, deviceParams);

    const deviceData = {};
    deviceResult.rows.forEach(row => {
      deviceData[row.device || 'unknown'] = parseInt(row.count);
    });

    res.json({
      event,
      count: parseInt(result.rows[0].count),
      uniqueUsers: parseInt(result.rows[0].uniqueUsers),
      deviceData
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

/**
 * @swagger
 * /api/analytics/user-stats:
 *   get:
 *     summary: Get user stats
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User stats
 */
router.get('/user-stats', authenticateApiKey, async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId query param required' });

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total_events, ip_address, metadata->>'browser' as browser, metadata->>'os' as os
       FROM events WHERE user_id = $1 AND app_id = $2
       GROUP BY ip_address, metadata->>'browser', metadata->>'os' LIMIT 1`,
      [userId, parseInt(req.user.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data for this user' });
    }

    const row = result.rows[0];
    res.json({
      userId,
      totalEvents: parseInt(row.total_events),
      deviceDetails: { browser: row.browser || null, os: row.os || null },
      ipAddress: row.ip_address || null
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

module.exports = router;