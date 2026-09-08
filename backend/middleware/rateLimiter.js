const {
  rateLimit: redisRateLimit,
  getRedisClient,
} = require("../config/redis");
const { log, logError } = require("../utils/logger");

// Check if rate limiting is disabled (for development)
const RATE_LIMIT_DISABLED =
  process.env.RATE_LIMIT_DISABLED === "true" ||
  process.env.NODE_ENV === "development";

/**
 * Check if Redis is available
 */
function isRedisAvailable() {
  try {
    getRedisClient();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Rate limiting middleware using Redis
 * @param {object} options - Rate limiting options
 * @param {number} options.limit - Max requests per window (default: 100)
 * @param {number} options.windowSeconds - Time window in seconds (default: 60)
 * @param {string} options.keyPrefix - Prefix for rate limit keys (default: "ratelimit")
 * @param {function} options.getKeyFn - Custom function to generate rate limit key (default: uses IP)
 */
const rateLimiter = (options = {}) => {
  const {
    limit = 100,
    windowSeconds = 60,
    keyPrefix = "ratelimit",
    getKeyFn = null,
  } = options;

  return async (req, res, next) => {
    // Skip rate limiting if disabled
    if (RATE_LIMIT_DISABLED) {
      return next();
    }

    // Skip rate limiting if Redis is not available
    if (!isRedisAvailable()) {
      return next();
    }

    try {
      // Generate rate limit key
      let identifier;
      if (getKeyFn) {
        identifier = await getKeyFn(req);
      } else {
        // Default: use IP address
        identifier = req.ip || req.connection.remoteAddress || "unknown";
      }

      const key = `${keyPrefix}:${identifier}`;

      // Check rate limit
      const result = await redisRateLimit.check(
        identifier,
        limit,
        windowSeconds,
      );

      // Add rate limit headers
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", result.reset);

      if (!result.allowed) {
        log(`Rate limit exceeded for: ${identifier}`);
        return res.status(429).json({
          success: false,
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${result.reset} seconds.`,
          retryAfter: result.reset,
        });
      }

      next();
    } catch (error) {
      logError(error, "Rate limiter error");
      // On error, allow request to fail open
      next();
    }
  };
};

/**
 * Rate limiter for API endpoints (stricter)
 */
const apiRateLimiter = rateLimiter({
  limit: parseInt(process.env.API_RATE_LIMIT) || 60, // 60 requests per minute (configurable)
  windowSeconds: 60,
  keyPrefix: "api",
});

/**
 * Rate limiter for authentication endpoints (very strict)
 */
const authRateLimiter = rateLimiter({
  limit: parseInt(process.env.AUTH_RATE_LIMIT) || 20, // 20 requests per minute (configurable, increased from 5)
  windowSeconds: 60,
  keyPrefix: "auth",
});

/**
 * Rate limiter for file uploads (moderate)
 */
const uploadRateLimiter = rateLimiter({
  limit: 10, // 10 uploads per minute
  windowSeconds: 60,
  keyPrefix: "upload",
});

/**
 * Rate limiter using user ID (for authenticated requests)
 */
const userRateLimiter = (limit = 100, windowSeconds = 60) => {
  return rateLimiter({
    limit,
    windowSeconds,
    keyPrefix: "user",
    getKeyFn: (req) => {
      // Try to get user ID from session
      const sessionId = req.headers.authorization?.replace("Bearer ", "");
      return sessionId || req.ip || "unknown";
    },
  });
};

/**
 * Reset rate limit for a specific identifier
 * @param {string} identifier - User ID, IP, or other identifier
 * @param {string} keyPrefix - Prefix for rate limit keys (default: "ratelimit")
 */
const resetRateLimit = async (identifier, keyPrefix = "ratelimit") => {
  try {
    // Skip if Redis is not available
    if (!isRedisAvailable()) {
      return false;
    }

    const success = await redisRateLimit.reset(`${keyPrefix}:${identifier}`);
    if (success) {
      log(`Rate limit reset for: ${identifier}`);
    }
    return success;
  } catch (error) {
    logError(error, `Failed to reset rate limit for: ${identifier}`);
    return false;
  }
};

module.exports = {
  rateLimiter,
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  userRateLimiter,
  resetRateLimit,
};
