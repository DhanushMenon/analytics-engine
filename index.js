require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Analytics Engine API Running!' });
});

// ONLY AUTH FOR NOW
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});