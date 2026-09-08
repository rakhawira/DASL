const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

const getSessionStats = async (req, res) => {
  try {
    log("Processing session statistics request");

    const queries = await Promise.all([
      // Total sessions
      pool.query("SELECT COUNT(*) as total FROM sessions"),

      // Active sessions
      pool.query(`
        SELECT COUNT(*) as active 
        FROM sessions 
        WHERE is_active = true AND expires_at > NOW()
      `),

      // Active users (unique users with active sessions)
      pool.query(`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM sessions 
        WHERE is_active = true AND expires_at > NOW()
      `),

      // Inactive sessions
      pool.query(`
        SELECT COUNT(*) as inactive 
        FROM sessions 
        WHERE is_active = false
      `),

      // Expired sessions
      pool.query(`
        SELECT COUNT(*) as expired 
        FROM sessions 
        WHERE expires_at <= NOW()
      `),

      // Sessions by user
      pool.query(`
        SELECT u.username, u.name, COUNT(*) as session_count,
               MAX(s.created_at) as last_session
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        GROUP BY u.id, u.username, u.name
        ORDER BY session_count DESC
        LIMIT 10
      `),

      // Recent sessions
      pool.query(`
        SELECT s.*, u.username, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
        LIMIT 10
      `),
    ]);

    const stats = {
      total_sessions: parseInt(queries[0].rows[0].total),
      active_sessions: parseInt(queries[1].rows[0].active),
      active_users: parseInt(queries[2].rows[0].active_users), // Total unique users with active sessions
      inactive_sessions: parseInt(queries[3].rows[0].inactive),
      expired_sessions: parseInt(queries[4].rows[0].expired),
      top_users: queries[5].rows.map((row) => ({
        ...row,
        session_count: parseInt(row.session_count),
      })),
      recent_sessions: queries[6].rows.map((row) => ({
        ...row,
        is_active: row.is_active,
        expires_at: row.expires_at,
        created_at: row.created_at,
        last_accessed: row.last_accessed,
      })),
    };

    return successResponse(
      res,
      stats,
      "Session statistics retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching session statistics");
    return errorResponse(res, error, "Failed to fetch session statistics");
  }
};

const getActiveSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT s.*, u.username, u.name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.is_active = true AND s.expires_at > NOW()
      ORDER BY s.last_accessed DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [parseInt(limit), offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM sessions s
      WHERE s.is_active = true AND s.expires_at > NOW()
    `;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    return successResponse(
      res,
      {
        sessions: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
      "Active sessions retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching active sessions");
    return errorResponse(res, error, "Failed to fetch active sessions");
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT s.*, u.username, u.name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Session not found");
    }

    return successResponse(
      res,
      result.rows[0],
      "Session retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching session by ID");
    return errorResponse(res, error, "Failed to fetch session");
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM sessions WHERE session_id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Session not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/sessions*");
    await invalidateCache("cache:/api/sessions/stats*");
    await invalidateCache("cache:/api/sessions/active*");

    return successResponse(res, result.rows[0], "Session deleted successfully");
  } catch (error) {
    logError(error, "Error deleting session");
    return errorResponse(res, error, "Failed to delete session");
  }
};

module.exports = {
  getSessionStats,
  getActiveSessions,
  getSessionById,
  deleteSession,
};
