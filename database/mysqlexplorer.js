const mysql = require('mysql2/promise');

/**
 * Deep schema exploration for MySQL
 */
const exploreMySQL = async (connectionString) => {
  try {
    // Parse MySQL connection string
    const url = new URL(`mysql://${connectionString}`);
    const config = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1)
    };

    const connection = await mysql.createConnection(config);

    const exploration = {
      databaseType: 'MySQL',
      connectionStatus: 'connected',
      database: config.database,
      tables: [],
      statistics: {
        totalTables: 0,
        totalRows: 0
      }
    };

    // Get all tables
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    for (const table of tables) {
      const tableName = table.TABLE_NAME;

      // Get columns
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [config.database, tableName]
      );

      // Get row count
      const [rowCount] = await connection.query(
        `SELECT COUNT(*) as count FROM ??`,
        [tableName]
      );

      // Get engine and collation
      const [tableInfo] = await connection.query(
        `SELECT ENGINE, TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [config.database, tableName]
      );

      // Get sample data
      const [sampleData] = await connection.query(
        `SELECT * FROM ?? LIMIT 3`,
        [tableName]
      );

      exploration.tables.push({
        name: tableName,
        engine: tableInfo[0]?.ENGINE,
        collation: tableInfo[0]?.TABLE_COLLATION,
        rowCount: rowCount[0]?.count || 0,
        columns: columns.map(col => ({
          name: col.COLUMN_NAME,
          type: col.COLUMN_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          key: col.COLUMN_KEY || null
        })),
        sampleData: sampleData
      });

      exploration.statistics.totalRows += rowCount[0]?.count || 0;
    }

    exploration.statistics.totalTables = tables.length;
    await connection.end();
    return exploration;
  } catch (err) {
    throw new Error(`MySQL exploration failed: ${err.message}`);
  }
};

module.exports = { exploreMySQL };
