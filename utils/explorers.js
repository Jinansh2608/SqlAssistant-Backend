const { Client } = require('pg');
const mongoose = require('mongoose');

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

module.exports = {
  explorePostgres,
  exploreMongo
};
