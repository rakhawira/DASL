const express = require("express");
const router = express.Router();
const {
  registerDevice,
  deviceHeartbeat,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  cleanupOfflineDevices,
  lockDevice,
  unlockDevice,
  updateDeviceStatus,
  getDeviceStats,
  triggerNFCAttendance,
  triggerQRAttendance,
  getPendingCommands,
  acknowledgeCommand,
  handleCommandResponse,
} = require("../controllers/deviceController");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");

// Device management routes with cache
router.get("/stats", cacheMiddleware(60), getDeviceStats); // 1 min cache (real-time stats)
router.post("/register", registerDevice);
router.post("/:device_id/heartbeat", deviceHeartbeat);
router.get("/:device_id/status", cacheMiddleware(60), getDeviceById); // 1 min cache
router.get("/", cacheMiddleware(300), getDevices); // 5 min cache
router.get("/:device_id", cacheMiddleware(300), getDeviceById); // 5 min cache
router.put("/:device_id", updateDevice);
router.delete("/:device_id", deleteDevice);
router.post("/cleanup-offline", cleanupOfflineDevices);

// Device control routes
router.post("/:device_id/lock", lockDevice);
router.post("/:device_id/unlock", unlockDevice);
router.put("/:device_id/status", updateDeviceStatus);
router.post("/:device_id/trigger-nfc", triggerNFCAttendance);
router.post("/:device_id/trigger-qr", triggerQRAttendance);

// Command polling routes (no cache - real-time)
router.get("/:device_id/commands", getPendingCommands);
router.get("/:device_id/commands/pending", getPendingCommands);
router.post("/:device_id/commands/:command_id/acknowledge", acknowledgeCommand);
router.put("/:device_id/commands/:command_id/response", handleCommandResponse);

module.exports = router;
