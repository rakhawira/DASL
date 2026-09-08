const express = require("express");
const router = express.Router();
const {
  processQRReading,
  cancelQRAttendance,
  getQRStatus,
} = require("../controllers/qrController");
const { cacheMiddleware } = require("../middleware/cache");

// QR attendance routes
router.post("/process-reading", processQRReading);
router.post("/cancel", cancelQRAttendance);
router.get("/status/:device_id", cacheMiddleware(60), getQRStatus);

module.exports = router;
