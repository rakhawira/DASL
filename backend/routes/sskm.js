const express = require("express");
const router = express.Router();
const { getSSKMStats } = require("../controllers/activityController");
const { cacheMiddleware } = require("../middleware/cache");

// SSKM statistics route
router.get("/stats", cacheMiddleware(600), getSSKMStats); // 10 min cache

module.exports = router;
