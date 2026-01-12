const axios = require('axios');

/**
 * Supabase Schema Exploration
 */
const exploreSupabase = async (url, apiKey) => {
  try {
    // Extract project ID from URL
    const projectMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    if (!projectMatch) {
      throw new Error('Invalid Supabase URL format');
    }

    const projectId = projectMatch[1];
    const baseURL = `https://${projectId}.supabase.co/rest/v1`;

    const exploration = {
      databaseType: 'Supabase',
      connectionStatus: 'connected',
      projectId,
      tables: [],
      statistics: {
        totalTables: 0
      }
    };

    // Get tables from Supabase API
    const response = await axios.get(`${baseURL}/`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (response.data) {
      exploration.tables = Object.keys(response.data).map(tableName => ({
        name: tableName,
        recordCount: response.data[tableName].length || 0
      }));
    }

    exploration.statistics.totalTables = exploration.tables.length;
    return exploration;
  } catch (err) {
    throw new Error(`Supabase exploration failed: ${err.message}`);
  }
};

module.exports = { exploreSupabase };
