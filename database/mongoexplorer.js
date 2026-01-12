const mongoose = require('mongoose');

/**
 * Deep schema exploration for MongoDB
 */
const exploreMongoDB = async (connectionString) => {
  try {
    await mongoose.connect(connectionString);
    const db = mongoose.connection.db;

    const exploration = {
      databaseType: 'MongoDB',
      connectionStatus: 'connected',
      collections: [],
      statistics: {
        totalCollections: 0,
        totalDocuments: 0
      }
    };

    const collectionNames = await db.listCollections().toArray();

    for (const collMeta of collectionNames) {
      const collName = collMeta.name;
      const collection = db.collection(collName);

      // Get document count
      const count = await collection.countDocuments();

      // Get sample document
      const sample = await collection.findOne();

      // Infer fields from sample
      const fields = sample ? Object.keys(sample).map(key => ({
        name: key,
        type: typeof sample[key],
        example: sample[key]
      })) : [];

      exploration.collections.push({
        name: collName,
        documentCount: count,
        fields: fields,
        sampleDocument: sample
      });

      exploration.statistics.totalDocuments += count;
    }

    exploration.statistics.totalCollections = collectionNames.length;
    await mongoose.disconnect();
    return exploration;
  } catch (err) {
    throw new Error(`MongoDB exploration failed: ${err.message}`);
  }
};

module.exports = { exploreMongoDB };
