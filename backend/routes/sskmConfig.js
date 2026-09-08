const express = require("express");
const router = express.Router();
const {
  getSSKMConfigs,
  getSSKMConfig,
  updateSSKMConfig,
  getMaxRequiredPoints,
  updateMaxRequiredPoints,
} = require("../controllers/sskmConfigController");
const { cacheMiddleware } = require("../middleware/cache");

// Get max required points (convenience endpoint)
router.get("/max-points", cacheMiddleware(3600), getMaxRequiredPoints);

// Update max required points (convenience endpoint)
router.put("/max-points", updateMaxRequiredPoints);

// Get all SSKM configurations
router.get("/", cacheMiddleware(3600), getSSKMConfigs);

// Get specific SSKM configuration
router.get("/:configKey", cacheMiddleware(3600), getSSKMConfig);

// Update SSKM configuration
router.put("/:configKey", updateSSKMConfig);

module.exports = router;
