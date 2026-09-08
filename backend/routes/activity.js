const express = require("express");
const router = express.Router();
const {
  getActivityPoints,
  addActivityPoint,
  updateActivityPoint,
  deleteActivityPoint,
  getSSKMStats,
  getStudentActivityPoints,
} = require("../controllers/activityController");
const { cacheMiddleware } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Activity points routes with cache
router.get("/", cacheMiddleware(600), getActivityPoints); // 10 min cache
router.post("/", apiRateLimiter, addActivityPoint);
router.put("/:id", apiRateLimiter, updateActivityPoint);
router.delete("/:id", apiRateLimiter, deleteActivityPoint);

// Statistics routes with cache
router.get("/stats/sskm", cacheMiddleware(300), getSSKMStats); // 5 min cache
router.get(
  "/student/:student_id",
  cacheMiddleware(600),
  getStudentActivityPoints,
); // 10 min cache

module.exports = router;
