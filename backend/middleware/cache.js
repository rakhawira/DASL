const { cache: redisCache, getRedisClient } = require("../config/redis");
const { log, logError } = require("../utils/logger");

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
 * Cache middleware for GET requests
 * @param {number} ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
 */
const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip caching if Redis is not available
    if (!isRedisAvailable()) {
      return next();
    }

    try {
      // Generate cache key based on URL and query params
      const cacheKey = `cache:${req.originalUrl}`;

      // Try to get from cache
      const cachedData = await redisCache.get(cacheKey);

      if (cachedData) {
        log(`Cache hit for: ${req.originalUrl}`);
        return res.json(cachedData);
      }

      // Cache miss - store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = async (data) => {
        // Only cache successful responses
        if (data && data.success !== false) {
          try {
            await redisCache.set(cacheKey, data, ttlSeconds);
            log(`Cached response for: ${req.originalUrl}`);
          } catch (error) {
            logError(error, `Failed to cache response for: ${req.originalUrl}`);
          }
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logError(error, "Cache middleware error");
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern to invalidate
 */
const invalidateCache = async (pattern) => {
  try {
    // Skip if Redis is not available
    if (!isRedisAvailable()) {
      return 0;
    }

    const count = await redisCache.delPattern(pattern);
    log(`Invalidated ${count} cache entries matching: ${pattern}`);
    return count;
  } catch (error) {
    logError(error, `Failed to invalidate cache pattern: ${pattern}`);
    return 0;
  }
};

/**
 * Invalidate cache by specific key
 * @param {string} key - Cache key to invalidate
 */
const invalidateCacheKey = async (key) => {
  try {
    // Skip if Redis is not available
    if (!isRedisAvailable()) {
      return false;
    }

    const result = await redisCache.del(key);
    if (result) {
      log(`Invalidated cache key: ${key}`);
    }
    return result;
  } catch (error) {
    logError(error, `Failed to invalidate cache key: ${key}`);
    return false;
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateCacheKey,
};
