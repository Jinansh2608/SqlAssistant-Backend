const fs = require('fs');
const path = require('path');

const CONNECTIONS_FILE = path.join(__dirname, '../.connections.json');

const connectionsStorage = {
  addConnection: (name, connectionString, metadata) => {
    const connections = connectionsStorage.loadConnections();
    const id = `conn_${Date.now()}`;
    
    connections[id] = {
      id,
      name,
      connectionString,
      metadata,
      savedAt: new Date().toISOString(),
      maskedPassword: connectionString.replace(/password[=:]?([^&\s]+)/i, 'password=***')
    };

    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
    console.log(`✓ Connection saved: ${id} (${name})`);
    return id;
  },

  getConnection: (id) => {
    const connections = connectionsStorage.loadConnections();
    return connections[id] || null;
  },

  getUnmaskedConnection: (id) => {
    const connections = connectionsStorage.loadConnections();
    return connections[id] || null;
  },

  listConnections: () => {
    const connections = connectionsStorage.loadConnections();
    return Object.values(connections).map(conn => ({
      id: conn.id,
      name: conn.name,
      maskedPassword: conn.maskedPassword,
      savedAt: conn.savedAt
    }));
  },

  deleteConnection: (id) => {
    const connections = connectionsStorage.loadConnections();
    if (connections[id]) {
      delete connections[id];
      fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
      console.log(`✓ Connection deleted: ${id}`);
      return true;
    }
    return false;
  },

  loadConnections: () => {
    try {
      if (fs.existsSync(CONNECTIONS_FILE)) {
        const data = fs.readFileSync(CONNECTIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('Could not load connections:', err.message);
    }
    return {};
  }
};

module.exports = connectionsStorage;
