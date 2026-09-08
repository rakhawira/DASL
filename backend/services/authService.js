const pool = require("../config/database");
const { logDatabase, logError } = require("../utils/logger");
const { DEFAULT_SESSION_TIMEOUT } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

const authenticateUser = async (username, password) => {
  try {
    const query = "SELECT * FROM users WHERE username = $1 AND password = $2";
    logDatabase("SELECT", query, [username, "***"]);
    const result = await pool.query(query, [username, password]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error authenticating user");
    throw error;
  }
};

const createSession = async (userId) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_TIMEOUT);

    const sessionQuery = `
      INSERT INTO sessions (session_id, user_id, expires_at) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;

    logDatabase("INSERT", sessionQuery, [sessionId, userId, expiresAt]);
    const result = await pool.query(sessionQuery, [
      sessionId,
      userId,
      expiresAt,
    ]);

    return {
      sessionId,
      expiresAt,
      session: result.rows[0],
    };
  } catch (error) {
    logError(error, "Error creating session");
    throw error;
  }
};

const validateSession = async (sessionId) => {
  try {
    const query = `
      SELECT s.*, u.id as user_id, u.username, u.name, u.role 
      FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.session_id = $1 AND s.is_active = true AND s.expires_at > NOW()
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const updateQuery =
      "UPDATE sessions SET last_accessed = NOW() WHERE session_id = $1";
    await pool.query(updateQuery, [sessionId]);

    return result.rows[0];
  } catch (error) {
    logError(error, "Error validating session");
    throw error;
  }
};

const invalidateSession = async (sessionId) => {
  try {
    const query = "UPDATE sessions SET is_active = false WHERE session_id = $1";
    const result = await pool.query(query, [sessionId]);

    return result.rowCount > 0;
  } catch (error) {
    logError(error, "Error invalidating session");
    throw error;
  }
};

const cleanupExpiredSessions = async () => {
  try {
    const query =
      "UPDATE sessions SET is_active = false WHERE expires_at <= NOW() OR is_active = false";
    const result = await pool.query(query);

    return result.rowCount;
  } catch (error) {
    logError(error, "Error cleaning up sessions");
    throw error;
  }
};

module.exports = {
  authenticateUser,
  createSession,
  validateSession,
  invalidateSession,
  cleanupExpiredSessions,
};
