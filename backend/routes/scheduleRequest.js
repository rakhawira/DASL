const express = require("express");
const router = express.Router();
const {
  getScheduleRequests,
  createScheduleRequest,
  updateScheduleRequestStatus,
  getScheduleRequestStats,
} = require("../controllers/scheduleRequestController");
const { cacheMiddleware } = require("../middleware/cache");

// GET /api/schedule-requests - Get all schedule requests
router.get("/", cacheMiddleware(300), getScheduleRequests);

// POST /api/schedule-requests - Create new schedule request
router.post("/", createScheduleRequest);

// PUT /api/schedule-requests/:id/status - Update schedule request status
router.put("/:id/status", updateScheduleRequestStatus);

// GET /api/schedule-requests/stats - Get schedule request statistics
router.get("/stats", cacheMiddleware(300), getScheduleRequestStats);

module.exports = router;
