// Global session storage
const sessions = {};

const sessionManager = {
  create: (connectionString, dbType, schema) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessions[sessionId] = {
      connectionString,
      dbType,
      schema,
      createdAt: new Date()
    };
    return sessionId;
  },

  get: (sessionId) => {
    return sessions[sessionId] || null;
  },

  delete: (sessionId) => {
    delete sessions[sessionId];
  },

  list: () => {
    return Object.entries(sessions).map(([id, data]) => ({
      sessionId: id,
      dbType: data.dbType,
      createdAt: data.createdAt
    }));
  },

  exists: (sessionId) => {
    return !!sessions[sessionId];
  }
};

module.exports = sessionManager;
