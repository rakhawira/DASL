const express = require("express");
const router = express.Router();
const {
  getAttendanceLogs,
  getAttendanceStats,
  createAttendanceLog,
  getAttendanceByDeviceUID,
} = require("../controllers/attendanceController");
const { cacheMiddleware } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Attendance log routes with cache
router.get("/", cacheMiddleware(300), getAttendanceLogs); // 5 min cache
router.get("/stats", cacheMiddleware(60), getAttendanceStats); // 1 min cache (real-time stats)
router.post("/", apiRateLimiter, createAttendanceLog);
router.get(
  "/by-device-uid/:device_uid",
  cacheMiddleware(300),
  getAttendanceByDeviceUID,
); // 5 min cache

module.exports = router;

const statsRouter = express.Router();
statsRouter.get("/", getAttendanceStats);

module.exports.stats = statsRouter;
