const { createClient } = require("redis");
const { log, logError } = require("../utils/logger");

let redisClient = null;
let redisSubscriber = null;

/**
 * Create Redis client connection
 */
async function createRedisClient() {
  try {
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    });

    client.on("error", (err) => {
      logError(err, "Redis Client Error");
    });

    client.on("connect", () => {
      log("Redis client connected");
    });

    client.on("disconnect", () => {
      log("Redis client disconnected");
    });

    await client.connect();
    return client;
  } catch (error) {
    logError(error, "Failed to create Redis client");
    throw error;
  }
}

/**
 * Initialize Redis client
 */
async function initializeRedis() {
  try {
    if (!redisClient) {
      redisClient = await createRedisClient();
      log("Redis initialized successfully");
    }
    return redisClient;
  } catch (error) {
    logError(
      error,
      "Redis initialization failed - application will continue without Redis",
    );
    // Don't throw error - allow application to continue without Redis
    return null;
  }
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!redisClient) {
    throw new Error(
      "Redis client not initialized. Call initializeRedis() first.",
    );
  }
  return redisClient;
}

/**
 * Create Redis subscriber for Pub/Sub
 */
async function createRedisSubscriber() {
  try {
    if (!redisSubscriber) {
      redisSubscriber = await createRedisClient();
      log("Redis subscriber created");
    }
    return redisSubscriber;
  } catch (error) {
    logError(error, "Failed to create Redis subscriber");
    throw error;
  }
}

/**
 * Get Redis subscriber instance
 */
function getRedisSubscriber() {
  if (!redisSubscriber) {
    throw new Error(
      "Redis subscriber not initialized. Call createRedisSubscriber() first.",
    );
  }
  return redisSubscriber;
}

/**
 * Close Redis connections
 */
async function closeRedisConnections() {
  try {
    if (redisClient) {
      await redisClient.quit();
      log("Redis client closed");
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      log("Redis subscriber closed");
    }
  } catch (error) {
    logError(error, "Error closing Redis connections");
  }
}

/**
 * Cache helper functions
 */
const cache = {
  /**
   * Set value in cache with expiration
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const client = getRedisClient();
      const serializedValue = JSON.stringify(value);
      await client.setEx(key, ttlSeconds, serializedValue);
      return true;
    } catch (error) {
      logError(error, `Cache set failed for key: ${key}`);
      return false;
    }
  },

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      logError(error, `Cache get failed for key: ${key}`);
      return null;
    }
  },

  /**
   * Delete key from cache
   */
  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logError(error, `Cache delete failed for key: ${key}`);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return keys.length;
    } catch (error) {
      logError(error, `Cache delete pattern failed for: ${pattern}`);
      return 0;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logError(error, `Cache exists check failed for key: ${key}`);
      return false;
    }
  },
};

/**
 * Pub/Sub helper functions
 */
const pubsub = {
  /**
   * Publish message to channel
   */
  async publish(channel, message) {
    try {
      const client = getRedisClient();
      const serializedMessage = JSON.stringify(message);
      await client.publish(channel, serializedMessage);
      return true;
    } catch (error) {
      logError(error, `Pub/Sub publish failed for channel: ${channel}`);
      return false;
    }
  },

  /**
   * Subscribe to channel
   */
  async subscribe(channel, callback) {
    try {
      const subscriber = await createRedisSubscriber();
      await subscriber.subscribe(channel, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logError(
            error,
            `Failed to parse Pub/Sub message from channel: ${channel}`,
          );
          callback(message);
        }
      });
      log(`Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      logError(error, `Pub/Sub subscribe failed for channel: ${channel}`);
      return false;
    }
  },

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel) {
    try {
      const subscriber = getRedisSubscriber();
      await subscriber.unsubscribe(channel);
      log(`Unsubscribed from channel: ${channel}`);
      return true;
    } catch (error) {
      logError(error, `Pub/Sub unsubscribe failed for channel: ${channel}`);
      return false;
    }
  },
};

/**
 * Session helper functions
 */
const session = {
  /**
   * Set session data
   */
  async set(sessionId, data, ttlSeconds = 86400) {
    // Default 24 hours
    const key = `session:${sessionId}`;
    return await cache.set(key, data, ttlSeconds);
  },

  /**
   * Get session data
   */
  async get(sessionId) {
    const key = `session:${sessionId}`;
    return await cache.get(key);
  },

  /**
   * Delete session
   */
  async del(sessionId) {
    const key = `session:${sessionId}`;
    return await cache.del(key);
  },

  /**
   * Check if session exists
   */
  async exists(sessionId) {
    const key = `session:${sessionId}`;
    return await cache.exists(key);
  },
};

/**
 * Rate limiting helper functions
 */
const rateLimit = {
  /**
   * Check rate limit
   * @param {string} identifier - User ID, IP, or other identifier
   * @param {number} limit - Max requests allowed
   * @param {number} windowSeconds - Time window in seconds
   */
  async check(identifier, limit = 100, windowSeconds = 60) {
    try {
      const client = getRedisClient();
      const key = `ratelimit:${identifier}`;
      const current = await client.incr(key);

      if (current === 1) {
        // First request, set expiration
        await client.expire(key, windowSeconds);
      }

      const ttl = await client.ttl(key);
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        reset: ttl,
      };
    } catch (error) {
      logError(error, `Rate limit check failed for: ${identifier}`);
      // On error, allow request to fail open
      return {
        allowed: true,
        remaining: limit,
        reset: 0,
      };
    }
  },

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier) {
    try {
      const client = getRedisClient();
      const key = `ratelimit:${identifier}`;
      await client.del(key);
      return true;
    } catch (error) {
      logError(error, `Rate limit reset failed for: ${identifier}`);
      return false;
    }
  },
};

module.exports = {
  initializeRedis,
  getRedisClient,
  createRedisSubscriber,
  getRedisSubscriber,
  closeRedisConnections,
  cache,
  pubsub,
  session,
  rateLimit,
};
