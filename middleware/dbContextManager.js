// Global context storage
let contexts = {};

const dbContextManager = {
  createContext: (connectionString, dbType, metadata, additionalConfig = {}) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    contexts[sessionId] = {
      connectionString,
      dbType,
      metadata,
      config: additionalConfig,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    console.log(`✓ Context created: ${sessionId}`);
    return sessionId;
  },

  getContext: (sessionId) => {
    if (contexts[sessionId]) {
      contexts[sessionId].lastAccessed = new Date().toISOString();
      return contexts[sessionId];
    }
    return null;
  },

  contextExists: (sessionId) => {
    return !!contexts[sessionId];
  },

  closeContext: (sessionId) => {
    if (contexts[sessionId]) {
      delete contexts[sessionId];
      console.log(`✓ Context closed: ${sessionId}`);
      return true;
    }
    return false;
  },

  listContexts: () => {
    return Object.entries(contexts).map(([id, data]) => ({
      sessionId: id,
      dbType: data.dbType,
      createdAt: data.createdAt,
      lastAccessed: data.lastAccessed
    }));
  },

  getAllContexts: () => contexts
};

module.exports = dbContextManager;
