const express = require("express");
const router = express.Router();
const {
  getNewsList,
  getNewsStats,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  getNewsCategories,
} = require("../controllers/newsController");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Public news routes with cache
router.get("/", cacheMiddleware(1800), getNewsList); // 30 min cache
router.get("/stats", cacheMiddleware(300), getNewsStats); // 5 min cache
router.get("/categories", cacheMiddleware(3600), getNewsCategories); // 1 hour cache

// Individual news route with cache (must come last)
router.get("/:id", cacheMiddleware(1800), getNewsById); // 30 min cache

// CRUD operations with cache invalidation and rate limiting
router.post("/", apiRateLimiter, createNews);
router.put("/:id", apiRateLimiter, updateNews);
router.delete("/:id", apiRateLimiter, deleteNews);

module.exports = router;
