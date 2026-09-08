const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const { log, logError } = require("./utils/logger");

// Import WebSocket service
const websocketService = require("./services/websocketService");

// Import Redis
const { initializeRedis, closeRedisConnections } = require("./config/redis");

// Import configurations
const { port, addr, cors: corsConfig, bodyLimit } = require("./config/server");

// Import services
// Note: cleanupOfflineDevices removed - using heartbeat-based detection

// Import middleware
const requestLogger = require("./middleware/requestLogger");
const timeoutMiddleware = require("./middleware/timeout");
const { apiRateLimiter } = require("./middleware/rateLimiter");
const { cacheMiddleware } = require("./middleware/cache");

// Import routes
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/news");
const userRoutes = require("./routes/users");
const attendanceRoutes = require("./routes/attendance");
const courseRoutes = require("./routes/courses");
const deviceRoutes = require("./routes/devices");
const activityRoutes = require("./routes/activity");
const sessionRoutes = require("./routes/sessions");
const sskmRoutes = require("./routes/sskm");
const sskmConfigRoutes = require("./routes/sskmConfig");
const studentRoutes = require("./routes/students");
const nfcRoutes = require("./routes/nfc");
const qrRoutes = require("./routes/qr");
const approvalRoutes = require("./routes/approval");
const scheduleRequestRoutes = require("./routes/scheduleRequest");
const perwalianRoutes = require("./routes/perwalian");
const chatRoutes = require("./routes/chat");
const notificationRoutes = require("./routes/notifications");

// Import controllers for direct routes
const { getAdminNewsList } = require("./controllers/newsController");

const app = express();

// Middleware setup
app.use(helmet());
app.use(cors(corsConfig));
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(timeoutMiddleware);
app.use(requestLogger);

// API Routes with rate limiting (except device endpoints)
app.use("/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.get("/api/admin/news", apiRateLimiter, getAdminNewsList); // Direct route for admin news (no cache to ensure fresh data)
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/attendance-logs", attendanceRoutes);
app.use("/api/attendance-stats", attendanceRoutes.stats);
app.use("/api/devices", deviceRoutes); // No rate limiting for device endpoints (heartbeat, commands need frequent access)
app.use("/api/activity-points", activityRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/sskm", sskmRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/nfc", nfcRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/sskm-config", sskmConfigRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/schedule-requests", scheduleRequestRoutes);
app.use("/api/perwalian", perwalianRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const pool = require("./config/database");
    const timestamp = new Date().toISOString();

    const dbCheck = await pool.query("SELECT NOW()");
    const wsInfo = websocketService.getServerInfo();

    res.status(200).json({
      success: true,
      message: "DASL Backend API is running",
      version: "2.0.0",
      timestamp,
      websocket: wsInfo,
      endpoints: {
        auth: "/auth/login, /auth/logout, /auth/verify",
        news: "/api/news",
        admin_news: "/api/admin/news",
        users: "/api/users",
        courses: "/api/courses",
        attendance_logs: "/api/attendance-logs",
        attendance_stats: "/api/attendance-stats",
        devices: "/api/devices",
        device_stats: "/api/devices/stats",
        activity_points: "/api/activity-points",
        sessions: "/api/sessions",
        sskm_stats: "/api/sskm/stats",
        student_activity: "/api/students/:id/activity-points",
        nfc: "/api/nfc/trigger, /api/nfc/process-reading, /api/nfc/status/:device_id",
        qr: "/api/qr/process-reading, /api/qr/cancel, /api/qr/status/:device_id",
        chat: "/api/chat/conversations, /api/chat/messages, /api/chat/users",
        notifications: "/api/notifications",
        websocket: "/ws-info",
      },
      database: {
        status: "connected",
        timestamp: dbCheck.rows[0].now,
      },
    });
  } catch (error) {
    logError(error, "Health check failed");
    res.status(500).json({
      success: false,
      message: "DASL Backend API - Health Check Failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Socket.io info endpoint
app.get("/ws-info", (req, res) => {
  const wsInfo = websocketService.getServerInfo();
  res.status(200).json({
    websocketUrl: `http://${addr}:${port}`, // Socket.io uses HTTP protocol
    ...wsInfo,
    timestamp: new Date().toISOString(),
  });
});

// Backend notification endpoint for QR acknowledgment
app.post("/notify/qr_ack", (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    try {
      const data = JSON.parse(body);
      log("QR acknowledgment notification received:", data);

      // Forward to websocket service for handling
      const sessionManager = require("./utils/sessionManager");
      const deviceManager = require("./utils/deviceManager");

      const { deviceId, qrCode, success, timestamp } = data;

      if (!success || !deviceId || !qrCode) {
        log("QR acknowledgment invalid or failed:", data);
        res.status(400).json({ error: "Invalid QR acknowledgment data" });
        return;
      }

      log(`QR acknowledgment for device ${deviceId}: ${qrCode}`);

      const device = deviceManager.getDevice(deviceId);
      const deviceName = device?.deviceName || device?.device_name || deviceId;
      const location = device?.location || "Unknown";

      sessionManager.createQRSession(deviceId, {
        clientId: "backend",
        qrCode,
        deviceName,
        location,
        timestamp: timestamp || Date.now(),
      });

      log(`QR session created from backend for device ${deviceId}`);

      res.status(200).json({ success: true });
    } catch (error) {
      logError(error, "Error processing QR acknowledgment notification");
      res.status(400).json({ error: "Invalid JSON" });
    }
  });
});

// Root endpoint - API info
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DASL Backend API",
    version: "2.0.0",
    documentation: "/health for detailed status",
    endpoints: {
      health: "/health",
      auth: "/auth",
      api: "/api",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logError(error, `Unhandled error in ${req.method} ${req.originalUrl}`);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// Start server
const server = http.createServer(app);

// Initialize Redis (non-blocking)
initializeRedis()
  .then(() => {
    log("Redis initialized successfully");
  })
  .catch((error) => {
    logError(error, "Failed to initialize Redis - continuing without Redis");
  });

websocketService.initialize(server);

server.listen(port, addr, () => {
  log(`DASL Backend API v2.0.0 running at ${addr}:${port}`);
  log(`Socket.io server available at http://${addr}:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  log("SIGTERM signal received: closing HTTP server");
  await closeRedisConnections();
  server.close(() => {
    log("HTTP server closed");
  });
});

process.on("SIGINT", async () => {
  log("SIGINT signal received: closing HTTP server");
  await closeRedisConnections();
  server.close(() => {
    log("HTTP server closed");
  });
});

// Note: Device cleanup now handled by heartbeat-based detection
// Auto-cleanup scheduler removed for better reliability

// Import device controller for heartbeat check
const {
  checkHeartbeatBasedOffline,
} = require("./controllers/deviceController");

// Start heartbeat-based offline detection scheduler - run every 15 seconds
setInterval(async () => {
  try {
    const offlineDevices = await checkHeartbeatBasedOffline();
    if (offlineDevices.length > 0) {
      log(
        `Heartbeat-based detection: ${offlineDevices.length} devices marked offline`,
      );
    }
  } catch (error) {
    logError(error, "Error in heartbeat-based offline detection scheduler");
  }
}, 15000); // Run every 15 seconds

module.exports = app;
