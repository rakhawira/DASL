const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
} = require("../controllers/courseController");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Course routes with cache
router.get("/", cacheMiddleware(1800), getCourses); // 30 min cache
router.get("/:id", cacheMiddleware(1800), getCourseById); // 30 min cache
router.post("/", apiRateLimiter, createCourse);
router.put("/:id", apiRateLimiter, updateCourse);
router.delete("/:id", apiRateLimiter, deleteCourse);
router.patch("/:id/toggle-status", apiRateLimiter, toggleCourseStatus);

module.exports = router;
