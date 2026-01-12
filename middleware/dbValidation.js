const dbContextManager = require('./dbContextManager');

const validateDBContext = (req, res, next) => {
  // Get sessionId from multiple sources
  const sessionId = 
    req.headers['x-db-session'] || 
    req.query.sessionId || 
    req.body.sessionId;

  if (!sessionId) {
    const availableSessions = dbContextManager.listContexts();
    return res.status(400).json({
      error: 'Missing session ID',
      availableSessions,
      hint: 'Provide sessionId via X-DB-Session header or query param',
      nextSteps: 'Use POST /api/database/confirm to create a session'
    });
  }

  if (!dbContextManager.contextExists(sessionId)) {
    const availableSessions = dbContextManager.listContexts();
    return res.status(400).json({
      success: false,
      error: 'Invalid session ID',
      providedSessionId: sessionId,
      availableSessions,
      debug: {
        hint: 'Session ID not found in server context',
        possibleReasons: [
          'Session expired',
          'Server restarted',
          'Wrong session ID provided'
        ]
      },
      nextSteps: 'Create a new session with POST /api/database/confirm'
    });
  }

  // Attach context to request
  req.dbContext = dbContextManager.getContext(sessionId);
  req.sessionId = sessionId;
  next();
};

module.exports = validateDBContext;
