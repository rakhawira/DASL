const express = require("express");
const router = express.Router();
const {
  processNFCReading,
  cancelNFCAttendance,
  getNFCStatus,
} = require("../controllers/nfcController");
const { cacheMiddleware } = require("../middleware/cache");

// NFC attendance routes
router.post("/process-reading", processNFCReading);
router.post("/cancel", cancelNFCAttendance);
router.get("/status/:device_id", cacheMiddleware(60), getNFCStatus);

module.exports = router;
