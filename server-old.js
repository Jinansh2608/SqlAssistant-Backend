const express = require('express');
const cors = require('cors');
const { PORT, NODE_ENV } = require('./config/env');
const databaseRoutes = require('./routes/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ROUTES ====================

// Database Exploration Routes
app.use('/api/database', databaseRoutes);

// GET - Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running', env: NODE_ENV });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});
