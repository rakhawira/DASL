const express = require("express");
const router = express.Router();
const {
  getSessionStats,
  getActiveSessions,
  getSessionById,
  deleteSession,
} = require("../controllers/sessionController");
const { cacheMiddleware } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Session statistics routes with cache
router.get("/stats", cacheMiddleware(60), getSessionStats); // 1 min cache (real-time stats)

// Session management routes with cache
router.get("/active", cacheMiddleware(60), getActiveSessions); // 1 min cache
router.get("/:id", cacheMiddleware(300), getSessionById); // 5 min cache
router.delete("/:id", apiRateLimiter, deleteSession);

module.exports = router;
