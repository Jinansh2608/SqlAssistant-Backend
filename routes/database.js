const express = require('express');
const router = express.Router();
const { Client } = require('pg');
const mongoose = require('mongoose');

const { explorePostgreSQL } = require('../database/postgresexplorer');
const { exploreMongoDB } = require('../database/mongoexplorer');
const { exploreMySQL } = require('../database/mysqlexplorer');
const { exploreFirebase } = require('../database/firebaseexplorer');
const { exploreSupabase } = require('../database/supabaseexplorer');
const { exploreRESTAPI } = require('../database/restexplorer');

const dbContextManager = require('../middleware/dbContextManager');
const validateDBContext = require('../middleware/dbValidation');
const connectionsStorage = require('../middleware/connectionsStorage');

// ============== HELPER FUNCTIONS ==============

const detectDBType = (connectionString) => {
  if (connectionString.includes('mongodb') || connectionString.includes('mongo')) return 'MongoDB';
  if (connectionString.includes('postgres') || connectionString.includes('postgresql')) return 'PostgreSQL';
  if (connectionString.includes('mysql')) return 'MySQL';
  if (connectionString.includes('firestore.googleapis')) return 'Firebase';
  if (connectionString.includes('supabase')) return 'Supabase';
  if (connectionString.startsWith('http')) return 'REST API';
  return 'Unknown';
};

// ============== API ENDPOINTS ==============

// 1. DETECT - Just detect the database type
router.post('/detect', (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Missing connectionString' });

    const dbType = detectDBType(connectionString);
    res.json({ success: true, dbType, connectionString });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TEST - Test connection without creating session
router.post('/test', async (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Missing connectionString' });

    const dbType = detectDBType(connectionString);

    if (dbType === 'PostgreSQL') {
      const client = new Client({ connectionString });
      await client.connect();
      await client.end();
    } else if (dbType === 'MongoDB') {
      await mongoose.connect(connectionString);
      await mongoose.disconnect();
    } else {
      return res.status(400).json({ error: `Database type ${dbType} test not implemented` });
    }

    res.json({ success: true, dbType, message: `${dbType} connection successful` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CONFIRM - Test connection + create session + explore schema
router.post('/confirm', async (req, res) => {
  try {
    const { connectionString } = req.body;
    if (!connectionString) return res.status(400).json({ error: 'Missing connectionString' });

    const dbType = detectDBType(connectionString);
    let metadata = null;

    // Test and explore
    if (dbType === 'PostgreSQL') {
      metadata = await explorePostgreSQL(connectionString);
    } else if (dbType === 'MongoDB') {
      metadata = await exploreMongoDB(connectionString);
    } else if (dbType === 'MySQL') {
      metadata = await exploreMySQL(connectionString);
    } else if (dbType === 'Firebase') {
      metadata = await exploreFirebase(connectionString, req.body.apiKey);
    } else if (dbType === 'Supabase') {
      metadata = await exploreSupabase(connectionString, req.body.apiKey);
    } else if (dbType === 'REST API') {
      metadata = await exploreRESTAPI(connectionString);
    } else {
      return res.status(400).json({ error: `Unsupported database type: ${dbType}` });
    }

    // Create session
    const sessionId = dbContextManager.createContext(connectionString, dbType, metadata, {
      apiKey: req.body.apiKey
    });

    res.json({ success: true, sessionId, dbType, message: 'Session created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET CONTEXT - Get current session info
router.get('/context/current', validateDBContext, (req, res) => {
  res.json({
    success: true,
    sessionId: req.sessionId,
    context: req.dbContext
  });
});

// 5. LIST CONTEXTS - List all active sessions
router.get('/contexts', (req, res) => {
  const contexts = dbContextManager.listContexts();
  res.json({ success: true, activeContexts: contexts, count: contexts.length });
});

// 6. EXPLORE - Get full schema from session
router.get('/explore/:sessionId', validateDBContext, (req, res) => {
  res.json({
    success: true,
    sessionId: req.sessionId,
    dbType: req.dbContext.dbType,
    schema: req.dbContext.metadata
  });
});

// 7. EXPLORE TABLE - Get specific table details
router.get('/explore/table/:sessionId/:tableName', validateDBContext, (req, res) => {
  const { tableName } = req.params;
  const metadata = req.dbContext.metadata;

  if (metadata.tables) {
    const table = metadata.tables.find(t => t.name === tableName);
    if (table) {
      return res.json({ success: true, table });
    }
  } else if (metadata.schemas) {
    for (const schema of metadata.schemas) {
      const table = schema.tables.find(t => t.name === tableName);
      if (table) {
        return res.json({ success: true, table });
      }
    }
  }

  res.status(404).json({ error: `Table ${tableName} not found` });
});

// 8. CLOSE CONTEXT - Close a session
router.delete('/context/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (dbContextManager.closeContext(sessionId)) {
    res.json({ success: true, message: 'Context closed' });
  } else {
    res.status(400).json({ error: 'Session not found' });
  }
});

// 9. SAVE CONNECTION - Save tested connection locally
router.post('/save-connection', (req, res) => {
  try {
    const { name, connectionString, dbType } = req.body;
    if (!name || !connectionString) return res.status(400).json({ error: 'Missing required fields' });

    const id = connectionsStorage.addConnection(name, connectionString, { dbType: dbType || detectDBType(connectionString) });
    res.json({ success: true, id, message: 'Connection saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. LIST SAVED CONNECTIONS
router.get('/list-connections', (req, res) => {
  const connections = connectionsStorage.listConnections();
  res.json({ success: true, connections, count: connections.length });
});

// 11. GET SAVED CONNECTION
router.get('/get-connection/:id', (req, res) => {
  const conn = connectionsStorage.getUnmaskedConnection(req.params.id);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });
  res.json({ success: true, connection: conn });
});

// 12. DELETE SAVED CONNECTION
router.delete('/delete-connection/:id', (req, res) => {
  if (connectionsStorage.deleteConnection(req.params.id)) {
    res.json({ success: true, message: 'Connection deleted' });
  } else {
    res.status(404).json({ error: 'Connection not found' });
  }
});

// 13. USE SAVED CONNECTION - Load and create session
router.post('/use-saved-connection/:id', async (req, res) => {
  try {
    const conn = connectionsStorage.getUnmaskedConnection(req.params.id);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const dbType = detectDBType(conn.connectionString);
    let metadata = null;

    if (dbType === 'PostgreSQL') {
      metadata = await explorePostgreSQL(conn.connectionString);
    } else if (dbType === 'MongoDB') {
      metadata = await exploreMongoDB(conn.connectionString);
    } else if (dbType === 'MySQL') {
      metadata = await exploreMySQL(conn.connectionString);
    } else {
      return res.status(400).json({ error: `Database type ${dbType} not supported` });
    }

    const sessionId = dbContextManager.createContext(conn.connectionString, dbType, metadata);
    res.json({ success: true, sessionId, dbType, message: 'Saved connection loaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. REST ENDPOINT - Explore arbitrary REST API
router.post('/rest', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    const metadata = await exploreRESTAPI(url);
    res.json({ success: true, metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
