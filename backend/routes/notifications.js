const express = require("express");
const router = express.Router();
const { generateNotifications } = require("../controllers/notificationController");
const { cacheMiddleware } = require("../middleware/cache");

// Get notifications for a user (cached for 5 minutes)
router.get("/", cacheMiddleware(300), generateNotifications);

module.exports = router;
