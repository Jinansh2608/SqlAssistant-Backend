// Generate session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Detect database type from connection string
const detectDB = (conn) => {
  if (conn.includes('mongodb') || conn.includes('mongo')) return 'MongoDB';
  if (conn.includes('postgresql') || conn.includes('postgres')) return 'PostgreSQL';
  if (conn.includes('mysql')) return 'MySQL';
  return 'Unknown';
};

module.exports = {
  generateSessionId,
  detectDB
};
