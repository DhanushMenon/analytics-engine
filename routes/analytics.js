// routes/analytics.js
const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { authenticateApiKey } = require('../middleware/auth');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate Limiter: 100 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

const rateLimit = (req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).json({ error: 'Too many requests' }));
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
        url,
        referrer,
        device,
        ipAddress,
        timestamp,
        JSON.stringify(metadata),
        userId
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
    WHERE event_type = $1 AND app_id = ANY($2)
  `;
  let params = [event, `{${req.user.id}}`]; // Default: user's apps

  if (app_id) {
    query = query.replace('AND app_id = ANY($2)', 'AND app_id = $2');
    params[1] = app_id;
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

    // Device breakdown
    const deviceQuery = `
      SELECT device, COUNT(*) as count 
      FROM events 
      WHERE event_type = $1 AND app_id = ANY($2)
      GROUP BY device
    `;
    const deviceParams = app_id ? [event, app_id] : [event, `{${req.user.id}}`];
    const deviceResult = await pool.query(deviceQuery, deviceParams);

    const deviceData = {};
    deviceResult.rows.forEach(row => {
      deviceData[row.device] = parseInt(row.count);
    });

    res.json({
      event,
      count: parseInt(result.rows[0].count),
      uniqueUsers: parseInt(result.rows[0].uniqueUsers),
      deviceData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Query failed' });
  }
});

module.exports = router;