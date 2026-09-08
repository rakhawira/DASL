const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  unauthorizedResponse,
} = require("../utils/response");
const { DEFAULT_SESSION_TIMEOUT } = require("../config/constants");
const { session: redisSession } = require("../config/redis");
const { invalidateCache } = require("../middleware/cache");
const bcrypt = require("bcrypt");
const { LoginSchema, LogoutSchema } = require("../schemas/validationSchemas");
const { v4: uuidv4 } = require("uuid");

const login = async (req, res) => {
  try {
    log("Processing login request");

    // Validate request body using zod
    const validationResult = LoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Login failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { username, password } = validationResult.data;

    log(`Attempting login for username: ${username}`);
    const query = `
      SELECT u.*, dt.dosen_type 
      FROM users u 
      LEFT JOIN dosen_types dt ON u.id = dt.user_id 
      WHERE u.username = $1
    `;
    logDatabase("SELECT", query, [username]);
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      log(`Login failed - Invalid credentials for username: ${username}`);
      return unauthorizedResponse(res, null, "Invalid username or password");
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      log(`Login failed - Invalid password for username: ${username}`);
      return unauthorizedResponse(res, null, "Invalid username or password");
    }

    log(`Login successful for user: ${username} (ID: ${user.id})`);

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_TIMEOUT);

    // Store session in Redis
    const sessionData = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "mahasiswa",
      jurusan: user.jurusan,
      fakultas: user.fakultas,
      avatar: user.avatar,
      dosenType: user.dosen_type,
      expiresAt: expiresAt,
    };
    const ttlSeconds = Math.floor(DEFAULT_SESSION_TIMEOUT / 1000);
    await redisSession.set(sessionId, sessionData, ttlSeconds);
    log(
      `Session stored in Redis for user ${username} - Session ID: ${sessionId}`,
    );

    // Also store in database for backup
    const sessionQuery = `
      INSERT INTO sessions (session_id, user_id, expires_at) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    logDatabase("INSERT", sessionQuery, [sessionId, user.id, expiresAt]);
    const sessionResult = await pool.query(sessionQuery, [
      sessionId,
      user.id,
      expiresAt,
    ]);
    log(
      `Session created in database for user ${username} - Session ID: ${sessionId}`,
    );

    // Invalidate cache for session stats
    await invalidateCache("cache:/api/sessions*");
    await invalidateCache("cache:/api/sessions/stats*");
    await invalidateCache("cache:/api/sessions/active*");

    const userData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "mahasiswa",
      jurusan: user.jurusan,
      fakultas: user.fakultas,
      avatar: user.avatar,
      dosenType: user.dosen_type, // Include dosen_type from the join
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return successResponse(
      res,
      {
        user: userData,
        sessionId: sessionId,
        expiresAt: expiresAt,
      },
      "Login successful",
    );
  } catch (error) {
    logError(error, "Error during login");
    return errorResponse(res, error, "Login failed");
  }
};

const logout = async (req, res) => {
  try {
    // Validate request body using zod
    const validationResult = LogoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Logout failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { sessionId } = validationResult.data;

    // Delete session from Redis
    await redisSession.del(sessionId);
    log(`Session deleted from Redis: ${sessionId}`);

    // Also update in database
    const query = "UPDATE sessions SET is_active = false WHERE session_id = $1";
    const result = await pool.query(query, [sessionId]);

    if (result.rowCount === 0) {
      return notFoundResponse(res, "Session not found");
    }

    // Invalidate cache for session stats
    await invalidateCache("cache:/api/sessions*");
    await invalidateCache("cache:/api/sessions/stats*");
    await invalidateCache("cache:/api/sessions/active*");

    return successResponse(res, null, "Logout successful");
  } catch (error) {
    logError(error, "Error during logout");
    return errorResponse(res, error, "Logout failed");
  }
};

const verifySession = async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return unauthorizedResponse(res, null, "No session provided");
    }

    // Try to get session from Redis first (faster)
    const redisSessionData = await redisSession.get(sessionId);

    if (redisSessionData) {
      log(`Session found in Redis: ${sessionId}`);
      const userData = {
        id: redisSessionData.userId,
        username: redisSessionData.username,
        name: redisSessionData.name,
        role: redisSessionData.role,
        jurusan: redisSessionData.jurusan,
        fakultas: redisSessionData.fakultas,
        avatar: redisSessionData.avatar,
        dosenType: redisSessionData.dosenType,
      };

      return successResponse(
        res,
        {
          user: userData,
          sessionId: sessionId,
          expiresAt: redisSessionData.expiresAt,
        },
        "Session valid",
      );
    }

    // Fallback to database if not in Redis
    log(`Session not found in Redis, checking database: ${sessionId}`);
    const query = `
      SELECT s.*, u.id as user_id, u.username, u.name, u.role, u.jurusan, u.fakultas, u.avatar,
             COALESCE(dt.dosen_type, NULL) as dosen_type
      FROM sessions s 
      JOIN users u ON s.user_id = u.id 
      LEFT JOIN dosen_types dt ON u.id = dt.user_id
      WHERE s.session_id = $1 AND s.is_active = true AND s.expires_at > NOW()
    `;
    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return unauthorizedResponse(res, null, "Invalid or expired session");
    }

    const updateQuery =
      "UPDATE sessions SET last_accessed = NOW() WHERE session_id = $1";
    await pool.query(updateQuery, [sessionId]);

    const session = result.rows[0];

    // Cache session in Redis for future requests
    const sessionData = {
      userId: session.user_id,
      username: session.username,
      name: session.name,
      role: session.role,
      jurusan: session.jurusan,
      fakultas: session.fakultas,
      avatar: session.avatar,
      dosenType: session.dosen_type,
      expiresAt: session.expires_at,
    };
    const ttlSeconds = Math.floor(
      (new Date(session.expires_at) - new Date()) / 1000,
    );
    if (ttlSeconds > 0) {
      await redisSession.set(sessionId, sessionData, ttlSeconds);
      log(`Session cached in Redis: ${sessionId}`);
    }

    const userData = {
      id: session.user_id,
      username: session.username,
      name: session.name,
      role: session.role,
      jurusan: session.jurusan,
      fakultas: session.fakultas,
      avatar: session.avatar,
      dosenType: session.dosen_type,
    };

    return successResponse(
      res,
      {
        user: userData,
        sessionId: sessionId,
        expiresAt: session.expires_at,
      },
      "Session valid",
    );
  } catch (error) {
    logError(error, "Error verifying session");
    return errorResponse(res, error, "Session verification failed");
  }
};

const cleanupSessions = async (req, res) => {
  try {
    const query =
      "UPDATE sessions SET is_active = false WHERE expires_at <= NOW() OR is_active = false";
    const result = await pool.query(query);

    return successResponse(res, null, `Cleaned up ${result.rowCount} sessions`);
  } catch (error) {
    logError(error, "Error during cleanup");
    return errorResponse(res, error, "Cleanup failed");
  }
};

module.exports = {
  login,
  logout,
  verifySession,
  cleanupSessions,
};
