const axios = require('axios');

/**
 * Firebase/Firestore Schema Exploration
 */
const exploreFirebase = async (url, apiKey) => {
  try {
    // Extract project ID from URL
    const projectMatch = url.match(/firestore\.googleapis\.com\/v1\/projects\/([^\/]+)/);
    if (!projectMatch) {
      throw new Error('Invalid Firebase URL format');
    }

    const projectId = projectMatch[1];
    const baseURL = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    const exploration = {
      databaseType: 'Firebase',
      connectionStatus: 'connected',
      projectId,
      collections: [],
      statistics: {
        totalCollections: 0
      }
    };

    // Try to list collections
    try {
      const response = await axios.get(baseURL, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });

      if (response.data && response.data.documents) {
        exploration.collections = response.data.documents.map(doc => ({
          name: doc.name.split('/').pop(),
          documentPath: doc.name
        }));
      }
    } catch (e) {
      // Firestore may not expose collection list endpoint
      exploration.collections = [{
        name: 'Note: Add collection names manually',
        info: 'Firebase Firestore API restrictions prevent automatic collection discovery'
      }];
    }

    exploration.statistics.totalCollections = exploration.collections.length;
    return exploration;
  } catch (err) {
    throw new Error(`Firebase exploration failed: ${err.message}`);
  }
};

module.exports = { exploreFirebase };
