// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// CRITICAL: Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(helmet());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Analytics Engine API Running!' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analytics', require('./routes/analytics'));
const { swaggerUi, specs } = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

