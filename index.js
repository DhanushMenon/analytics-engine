// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { swaggerUi, specs } = require('./swagger');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(helmet());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Analytics Engine API Running!' });
});

// Routes (must be before Swagger to scan JSDoc)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/analytics', require('./routes/analytics'));

// Swagger Docs (after routes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true, // Enable interactive explorer
  customCss: '.swagger-ui .topbar { display: block }' // Optional styling
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});