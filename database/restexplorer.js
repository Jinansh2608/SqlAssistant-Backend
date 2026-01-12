const axios = require('axios');

/**
 * REST API Schema Inference
 */
const exploreRESTAPI = async (url) => {
  try {
    const exploration = {
      databaseType: 'REST API',
      connectionStatus: 'connected',
      url,
      endpoints: [],
      statistics: {
        totalEndpoints: 0
      }
    };

    // Try to fetch from the URL
    const response = await axios.get(url, { timeout: 5000 });

    if (Array.isArray(response.data)) {
      // If response is array, infer schema from first item
      const sample = response.data[0];
      exploration.endpoints.push({
        path: url,
        method: 'GET',
        responseType: 'array',
        fields: Object.keys(sample).map(key => ({
          name: key,
          type: typeof sample[key],
          example: sample[key]
        }))
      });
    } else if (typeof response.data === 'object') {
      // If response is object, infer schema from keys
      exploration.endpoints.push({
        path: url,
        method: 'GET',
        responseType: 'object',
        fields: Object.keys(response.data).map(key => ({
          name: key,
          type: typeof response.data[key],
          example: response.data[key]
        }))
      });
    }

    exploration.statistics.totalEndpoints = exploration.endpoints.length;
    return exploration;
  } catch (err) {
    throw new Error(`REST API exploration failed: ${err.message}`);
  }
};

module.exports = { exploreRESTAPI };
