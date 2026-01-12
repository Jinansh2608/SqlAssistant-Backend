const { Client } = require('pg');

/**
 * Deep schema exploration for PostgreSQL
 */
const explorePostgreSQL = async (connectionString) => {
  const client = new Client({
    connectionString: connectionString
  });

  try {
    await client.connect();

    const exploration = {
      databaseType: 'PostgreSQL',
      connectionStatus: 'connected',
      schemas: [],
      statistics: {
        totalSchemas: 0,
        totalTables: 0,
        totalRelationships: 0
      }
    };

    // Get all schemas
    const schemaQuery = `
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `;
    const schemaResult = await client.query(schemaQuery);
    const schemas = schemaResult.rows.map(r => r.schema_name);

    for (const schemaName of schemas) {
      // Get all tables in schema
      const tablesQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      `;
      const tablesResult = await client.query(tablesQuery, [schemaName]);
      const tables = tablesResult.rows.map(r => r.table_name);

      const schemaExploration = {
        name: schemaName,
        tables: [],
        totalTables: tables.length
      };

      for (const tableName of tables) {
        // Get column details
        const columnsQuery = `
          SELECT 
            column_name, 
            data_type, 
            is_nullable, 
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `;
        const columnsResult = await client.query(columnsQuery, [schemaName, tableName]);

        // Get row count - with error handling
        let rowCount = 0;
        try {
          const countQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."${tableName}"`;
          const countResult = await client.query(countQuery);
          rowCount = parseInt(countResult.rows[0].count);
        } catch (countError) {
          console.warn(`Could not count rows for ${schemaName}.${tableName}:`, countError.message);
        }

        // Get primary keys - with error handling
        let primaryKeys = [];
        try {
          const pkQuery = `
            SELECT column_name
            FROM information_schema.constraint_column_usage
            WHERE table_schema = $1 AND table_name = $2 
            AND constraint_name IN (
              SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_schema = $1 AND table_name = $2 AND constraint_type = 'PRIMARY KEY'
            )
          `;
          const pkResult = await client.query(pkQuery, [schemaName, tableName]);
          primaryKeys = pkResult.rows.map(r => r.column_name);
        } catch (pkError) {
          console.warn(`Could not get primary keys for ${schemaName}.${tableName}:`, pkError.message);
        }

        // Get foreign keys with details - with error handling
        let foreignKeys = [];
        try {
          const fkQuery = `
            SELECT 
              kcu.constraint_name,
              kcu.column_name,
              ccu.table_name as referenced_table,
              ccu.column_name as referenced_column
            FROM information_schema.key_column_usage kcu
            LEFT JOIN information_schema.constraint_column_usage ccu 
              ON kcu.constraint_name = ccu.constraint_name
            JOIN information_schema.table_constraints tc
              ON kcu.constraint_name = tc.constraint_name
            WHERE tc.table_schema = $1 
              AND kcu.table_name = $2 
              AND tc.constraint_type = 'FOREIGN KEY'
          `;
          const fkResult = await client.query(fkQuery, [schemaName, tableName]);
          foreignKeys = fkResult.rows.map(fk => ({
            name: fk.constraint_name,
            column: fk.column_name,
            referencedTable: fk.referenced_table,
            referencedColumn: fk.referenced_column
          }));
        } catch (fkError) {
          console.warn(`Could not get foreign keys for ${schemaName}.${tableName}:`, fkError.message);
        }

        // Get indexes - with error handling
        let indexes = [];
        try {
          const indexQuery = `
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = $1 AND tablename = $2
          `;
          const indexResult = await client.query(indexQuery, [schemaName, tableName]);
          indexes = indexResult.rows.map(idx => ({
            name: idx.indexname,
            definition: idx.indexdef
          }));
        } catch (indexError) {
          console.warn(`Could not get indexes for ${schemaName}.${tableName}`);
        }

        // Get sample data - with error handling
        let sampleData = [];
        try {
          const sampleQuery = `SELECT * FROM "${schemaName}"."${tableName}" LIMIT 3`;
          const sampleResult = await client.query(sampleQuery);
          sampleData = sampleResult.rows;
        } catch (sampleError) {
          console.warn(`Could not fetch sample data for ${schemaName}.${tableName}`);
        }

        schemaExploration.tables.push({
          name: tableName,
          rowCount,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            dataType: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            maxLength: col.character_maximum_length,
            precision: col.numeric_precision,
            scale: col.numeric_scale,
            isPrimaryKey: primaryKeys.includes(col.column_name)
          })),
          primaryKeys,
          foreignKeys,
          indexes,
          sampleData
        });
      }

      exploration.schemas.push(schemaExploration);
      exploration.statistics.totalTables += tables.length;
    }

    exploration.statistics.totalSchemas = schemas.length;
    await client.end();
    return exploration;
  } catch (err) {
    throw new Error(`PostgreSQL exploration failed: ${err.message}`);
  }
};

module.exports = { explorePostgreSQL };
