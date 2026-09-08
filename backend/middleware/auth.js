const pool = require("../config/database");
const { unauthorizedResponse, notFoundResponse } = require("../utils/response");

const authenticateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return unauthorizedResponse(res, null, "No session provided");
    }

    const query = `
      SELECT s.*, u.id as user_id, u.username, u.name, u.role 
      FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.session_id = $1 AND s.is_active = true AND s.expires_at > NOW()
    `;
    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return unauthorizedResponse(res, null, "Invalid or expired session");
    }

    const updateQuery = "UPDATE sessions SET last_accessed = NOW() WHERE session_id = $1";
    await pool.query(updateQuery, [sessionId]);

    req.user = result.rows[0];
    req.sessionId = sessionId;
    next();
  } catch (error) {
    return unauthorizedResponse(res, error, "Session verification failed");
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, null, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      return forbiddenResponse(res, "Insufficient permissions");
    }

    next();
  };
};

module.exports = {
  authenticateSession,
  requireRole,
};
