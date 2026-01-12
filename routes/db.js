const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const mongoose = require('mongoose');
const { generateSessionId, detectDB } = require('../utils/helpers');
const { explorePostgres, exploreMongo } = require('../utils/explorers');
const sessionManager = require('../middleware/sessionManager');

// Saved connections array
const savedConnections = [];

// 1. TEST CONNECTION - No session created
router.post('/test', async (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Missing connectionString' });
    
    const dbType = detectDB(connectionString);
    let schema = null;
    
    if (dbType === 'PostgreSQL') {
      const client = new Client({ connectionString });
      await client.connect();
      await client.end();
      schema = 'PostgreSQL database connected';
    } else if (dbType === 'MongoDB') {
      await mongoose.connect(connectionString);
      await mongoose.disconnect();
      schema = 'MongoDB database connected';
    } else {
      return res.status(400).json({ error: 'Unsupported database type' });
    }
    
    res.json({ success: true, dbType, schema });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CONNECT & CREATE SESSION
router.post('/connect', async (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Missing connectionString' });
    
    const dbType = detectDB(connectionString);
    let schema = null;
    
    if (dbType === 'PostgreSQL') {
      schema = await explorePostgres(connectionString);
    } else if (dbType === 'MongoDB') {
      schema = await exploreMongo(connectionString);
    } else {
      return res.status(400).json({ error: 'Unsupported database type' });
    }
    
    // Create session
    const sessionId = sessionManager.create(connectionString, dbType, schema);
    
    res.json({ success: true, sessionId, dbType, tablesCount: schema.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET SCHEMA (requires session)
router.get('/schema/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.get(sessionId);
  
  if (!session) {
    return res.status(400).json({ error: 'Invalid session' });
  }
  
  res.json({ 
    success: true, 
    dbType: session.dbType,
    schema: session.schema 
  });
});

// 4. SAVE CONNECTION
router.post('/save-connection', (req, res) => {
  try {
    const { name, connectionString, dbType } = req.body;
    if (!name || !connectionString) return res.status(400).json({ error: 'Missing required fields' });
    
    const id = `conn_${Date.now()}`;
    savedConnections.push({
      id,
      name,
      connectionString,
      dbType: dbType || detectDB(connectionString),
      savedAt: new Date()
    });
    
    res.json({ success: true, id, message: 'Connection saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. LIST SAVED CONNECTIONS
router.get('/saved-connections', (req, res) => {
  res.json({ 
    success: true, 
    connections: savedConnections.map(c => ({
      id: c.id,
      name: c.name,
      dbType: c.dbType,
      savedAt: c.savedAt
    }))
  });
});

// 6. USE SAVED CONNECTION (Quick connect with one endpoint)
router.post('/use-saved/:id', async (req, res) => {
  try {
    const conn = savedConnections.find(c => c.id === req.params.id);
    if (!conn) return res.status(400).json({ error: 'Connection not found' });
    
    let schema = null;
    if (conn.dbType === 'PostgreSQL') {
      schema = await explorePostgres(conn.connectionString);
    } else if (conn.dbType === 'MongoDB') {
      schema = await exploreMongo(conn.connectionString);
    }
    
    const sessionId = sessionManager.create(conn.connectionString, conn.dbType, schema);
    
    res.json({ success: true, sessionId, dbType: conn.dbType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. LIST ACTIVE SESSIONS
router.get('/sessions', (req, res) => {
  res.json({ success: true, sessions: sessionManager.list() });
});

// 8. CLOSE SESSION
router.delete('/sessions/:sessionId', (req, res) => {
  if (sessionManager.exists(req.params.sessionId)) {
    sessionManager.delete(req.params.sessionId);
    res.json({ success: true, message: 'Session closed' });
  } else {
    res.status(400).json({ error: 'Session not found' });
  }
});

module.exports = router;
