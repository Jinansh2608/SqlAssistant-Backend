const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ============== SIMPLE IN-MEMORY STORAGE ==============
let sessions = {}; // { sessionId: { db, type, schema, connection } }
let connections = []; // Saved connections

// ============== HELPER FUNCTIONS ==============

// Generate session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Detect database type from connection string
const detectDB = (conn) => {
  if (conn.includes('mongodb') || conn.includes('mongo')) return 'MongoDB';
  if (conn.includes('postgresql') || conn.includes('postgres')) return 'PostgreSQL';
  if (conn.includes('mysql')) return 'MySQL';
  return 'Unknown';
};

// ============== DATABASE EXPLORERS ==============

// PostgreSQL Explorer
const explorePostgres = async (connString) => {
  const client = new Client({ connectionString: connString });
  try {
    await client.connect();
    
    // Get schemas
    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    `);
    
    const schemas = [];
    for (const schema of schemaRes.rows) {
      const schemaName = schema.schema_name;
      
      // Get tables
      const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      `, [schemaName]);
      
      const tables = [];
      for (const table of tablesRes.rows) {
        const tableName = table.table_name;
        
        // Get columns
        const colRes = await client.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [schemaName, tableName]);
        
        tables.push({
          name: tableName,
          columns: colRes.rows.map(c => ({
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === 'YES'
          }))
        });
      }
      
      schemas.push({
        name: schemaName,
        tables: tables
      });
    }
    
    await client.end();
    return schemas;
  } catch (err) {
    throw new Error(`PostgreSQL Error: ${err.message}`);
  }
};

// MongoDB Explorer
const exploreMongo = async (connString) => {
  try {
    await mongoose.connect(connString);
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    const result = [];
    
    for (const coll of collections) {
      const collName = coll.name;
      const collection = db.collection(collName);
      
      // Get sample documents
      const sample = await collection.findOne();
      const count = await collection.countDocuments();
      
      const fields = sample ? Object.keys(sample) : [];
      
      result.push({
        name: collName,
        count: count,
        fields: fields
      });
    }
    
    await mongoose.disconnect();
    return result;
  } catch (err) {
    throw new Error(`MongoDB Error: ${err.message}`);
  }
};

// ============== API ENDPOINTS ==============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', server: 'running' });
});

// 1. TEST CONNECTION - No session created
app.post('/api/test', async (req, res) => {
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
app.post('/api/connect', async (req, res) => {
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
    const sessionId = generateSessionId();
    sessions[sessionId] = {
      connectionString,
      dbType,
      schema,
      createdAt: new Date()
    };
    
    res.json({ success: true, sessionId, dbType, tablesCount: schema.length || schema.tables?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET SCHEMA (requires session)
app.get('/api/schema/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session' });
  }
  
  res.json({ 
    success: true, 
    dbType: sessions[sessionId].dbType,
    schema: sessions[sessionId].schema 
  });
});

// 4. SAVE CONNECTION
app.post('/api/save-connection', (req, res) => {
  try {
    const { name, connectionString, dbType } = req.body;
    if (!name || !connectionString) return res.status(400).json({ error: 'Missing required fields' });
    
    const id = `conn_${Date.now()}`;
    connections.push({
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
app.get('/api/saved-connections', (req, res) => {
  res.json({ 
    success: true, 
    connections: connections.map(c => ({
      id: c.id,
      name: c.name,
      dbType: c.dbType,
      savedAt: c.savedAt
    }))
  });
});

// 6. USE SAVED CONNECTION
app.post('/api/use-saved/:id', async (req, res) => {
  try {
    const conn = connections.find(c => c.id === req.params.id);
    if (!conn) return res.status(400).json({ error: 'Connection not found' });
    
    const sessionId = generateSessionId();
    
    let schema = null;
    if (conn.dbType === 'PostgreSQL') {
      schema = await explorePostgres(conn.connectionString);
    } else if (conn.dbType === 'MongoDB') {
      schema = await exploreMongo(conn.connectionString);
    }
    
    sessions[sessionId] = {
      connectionString: conn.connectionString,
      dbType: conn.dbType,
      schema,
      createdAt: new Date()
    };
    
    res.json({ success: true, sessionId, dbType: conn.dbType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. LIST ACTIVE SESSIONS
app.get('/api/sessions', (req, res) => {
  const list = Object.entries(sessions).map(([id, data]) => ({
    sessionId: id,
    dbType: data.dbType,
    createdAt: data.createdAt
  }));
  
  res.json({ success: true, sessions: list });
});

// 8. CLOSE SESSION
app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    res.json({ success: true, message: 'Session closed' });
  } else {
    res.status(400).json({ error: 'Session not found' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✓ Hackathon DB Explorer running on http://localhost:${PORT}`);
  console.log(`✓ Endpoints: /api/test, /api/connect, /api/schema/:sessionId, /api/saved-connections`);
});
