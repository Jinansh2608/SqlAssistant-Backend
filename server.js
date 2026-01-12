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
  console.log(`\n✓ Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`\n📋 Database Explorer API - Available Endpoints:\n`);
  console.log(`   Detection & Testing:`);
  console.log(`   1. POST /api/database/detect - Detect database type`);
  console.log(`   2. POST /api/database/test - Test connection only\n`);
  console.log(`   Session Management:`);
  console.log(`   3. POST /api/database/confirm - Test + Create session`);
  console.log(`   4. GET /api/database/context/current - Get current session`);
  console.log(`   5. GET /api/database/contexts - List all sessions`);
  console.log(`   6. GET /api/database/explore/:sessionId - Get full schema`);
  console.log(`   7. GET /api/database/explore/table/:sessionId/:tableName - Get table details`);
  console.log(`   8. DELETE /api/database/context/:sessionId - Close session\n`);
  console.log(`   Connection Storage:`);
  console.log(`   9. POST /api/database/save-connection - Save connection`);
  console.log(`   10. GET /api/database/list-connections - List saved`);
  console.log(`   11. GET /api/database/get-connection/:id - Get connection`);
  console.log(`   12. DELETE /api/database/delete-connection/:id - Delete connection`);
  console.log(`   13. POST /api/database/use-saved-connection/:id - Load & create session\n`);
  console.log(`   Supported Databases:`);
  console.log(`   - PostgreSQL (postgres://...)`);
  console.log(`   - MongoDB (mongodb://... or mongodb+srv://...)`);
  console.log(`   - MySQL (mysql://...)`);
  console.log(`   - Firebase (firestore.googleapis.com)`);
  console.log(`   - Supabase (*.supabase.co)`);
  console.log(`   - REST API (http://... or https://...)\n`);
});
