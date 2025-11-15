// routes/analytics.js
const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter: 100 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

const rateLimit = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many requests' }));
};

// Authenticate API key
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'x-api-key header required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, revoked FROM users WHERE api_key = $1',
      [apiKey]
    );

    if (result.rows.length === 0 || result.rows[0].revoked) {
      return res.status(401).json({ error: 'Invalid or revoked API key' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// POST /api/analytics/collect
router.post('/collect', rateLimit, authenticateApiKey, async (req, res) => {
  const {
    event,
    url,
    referrer,
    device,
    ipAddress,
    timestamp = new Date().toISOString(),
    metadata = {},
    userId
  } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'event is required' });
  }

  try {
    await pool.query(
      `INSERT INTO events 
       (app_id, event_type, url, referrer, device, ip_address, timestamp, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.id,
        event,
        url || null,
        referrer || null,
        device || null,
        ipAddress || null,
        timestamp,
        JSON.stringify(metadata),
        userId || null
      ]
    );

    res.status(201).json({ message: 'Event collected' });
  } catch (err) {
    console.error('Collect error:', err);
    res.status(500).json({ error: 'Failed to save event' });
  }
});

// GET /api/analytics/event-summary
router.get('/event-summary', authenticateApiKey, async (req, res) => {
  const { event, startDate, endDate, app_id } = req.query;

  if (!event) {
    return res.status(400).json({ error: 'event query param required' });
  }

  let query = `
    SELECT 
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as "uniqueUsers"
    FROM events 
    WHERE event_type = $1 AND app_id = $2
  `;
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

    const deviceQuery = `
      SELECT device, COUNT(*) as count 
      FROM events 
      WHERE event_type = $1 AND app_id = $2
      GROUP BY device
    `;
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

// GET /api/analytics/user-stats
router.get('/user-stats', authenticateApiKey, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId query param required' });
  }

  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_events,
         ip_address,
         metadata->>'browser' as browser,
         metadata->>'os' as os
       FROM events 
       WHERE user_id = $1 AND app_id = $2
       GROUP BY ip_address, metadata->>'browser', metadata->>'os'
       LIMIT 1`,
      [userId, parseInt(req.user.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data for this user' });
    }

    const row = result.rows[0];

    res.json({
      userId,
      totalEvents: parseInt(row.total_events),
      deviceDetails: {
        browser: row.browser || null,
        os: row.os || null
      },
      ipAddress: row.ip_address || null
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

module.exports = router;