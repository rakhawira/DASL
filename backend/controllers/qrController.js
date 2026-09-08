const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

// Constants
const DEVICE_STATUS = {
  ONLINE: "online",
  IN_USE: "in_use",
};

const SESSION_TYPE = {
  QR: "qr",
};

const ATTENDANCE_STATUS = "present";
const DEFAULT_DEVICE_NAME = "ESP32 Device";
const DEFAULT_LOCATION = "Unknown";

// Helper functions
const formatResponseTime = (ms) => {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

const invalidateQRCaches = async () => {
  await Promise.all([
    invalidateCache("cache:/api/attendance-logs*"),
    invalidateCache("cache:/api/attendance-stats*"),
    invalidateCache("cache:/api/notifications*"),
    invalidateCache("cache:/api/qr/*"),
    invalidateCache("cache:/api/devices/*"),
  ]);
};

const unlockDevice = async (device_id, username = null) => {
  const query = `
    UPDATE devices
    SET status = $1,
        username = $2,
        session_start = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE device_id = $4
    RETURNING *
  `;

  const params = username
    ? [DEVICE_STATUS.ONLINE, null, null, device_id]
    : [DEVICE_STATUS.ONLINE, null, null, device_id];

  if (username) {
    const queryWithUsername = `
      UPDATE devices 
      SET status = $1,
          username = $2,
          session_start = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $4 AND username = $5
      RETURNING *
    `;
    return await pool.query(queryWithUsername, [
      DEVICE_STATUS.ONLINE,
      null,
      null,
      device_id,
      username,
    ]);
  }

  return await pool.query(query, params);
};

const processQRReading = async (req, res) => {
  try {
    log("Processing QR reading from mobile app");
    const { device_id, qr_data, username, name, timestamp } = req.body;

    if (!device_id || !qr_data || !username) {
      log(`QR reading failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Device ID, QR data, and Username are required",
      );
    }

    log(
      `QR reading - Device ID: ${device_id}, Username: ${username}, QR: ${qr_data}`,
    );

    // Record start time for response time calculation
    const requestStartTime = Date.now();

    // Verify device exists
    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    // Get user information from request
    const user = {
      username: username,
      name: name,
    };

    // Create attendance log with username and name
    const attendanceQuery = `
      INSERT INTO attendance_logs (
        username,
        name,
        status,
        location,
        device_info,
        ip_address,
        timestamp,
        date,
        check_time,
        device_uid,
        device_name,
        response_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11)
      RETURNING *
    `;

    const attendanceParams = [
      user.username,
      user.name,
      ATTENDANCE_STATUS,
      deviceResult.rows[0].location || DEFAULT_LOCATION,
      device_id,
      deviceResult.rows[0].ip_address,
      Date.now(),
      new Date().toISOString().split("T")[0],
      qr_data,
      deviceResult.rows[0].device_name || DEFAULT_DEVICE_NAME,
      null,
    ];

    console.log("[Backend] Using backend timestamp for QR:", {
      backendTime: new Date().toISOString(),
      timestamp: Date.now(),
      date: new Date().toISOString().split("T")[0],
      receivedTimestamp: timestamp,
    });

    logDatabase("INSERT", attendanceQuery, attendanceParams);
    const attendanceResult = await pool.query(
      attendanceQuery,
      attendanceParams,
    );

    // Calculate response time (time from request start to database save)
    const responseTimeMs = Date.now() - requestStartTime;
    const responseTimeStr = formatResponseTime(responseTimeMs);

    // Update the attendance log with response time
    const updateResponseTimeQuery = `
      UPDATE attendance_logs
      SET response_time = $1
      WHERE id = $2
      RETURNING *
    `;
    await pool.query(updateResponseTimeQuery, [
      responseTimeStr,
      attendanceResult.rows[0].id,
    ]);

    log(
      `QR Attendance created successfully - User: ${user.name}, Device: ${device_id}, Response Time: ${responseTimeStr}`,
    );

    // Invalidate cache and unlock device
    await invalidateQRCaches();
    const unlockResult = await unlockDevice(device_id);
    log(`Device unlocked after successful QR attendance - ID: ${device_id}`);

    return successResponse(
      res,
      {
        attendance: {
          ...attendanceResult.rows[0],
          response_time: responseTimeStr,
        },
        user: {
          name: user.name,
          username: user.username,
        },
        device: unlockResult.rows[0],
        qr_data: qr_data,
        timestamp: new Date().toISOString(),
        response_time: responseTimeStr,
      },
      "QR attendance completed successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error processing QR reading");
    return errorResponse(res, error, "Failed to process QR reading");
  }
};

const cancelQRAttendance = async (req, res) => {
  try {
    const { device_id, username } = req.body;

    if (!device_id || !username) {
      return validationErrorResponse(
        res,
        null,
        "Device ID and Username are required",
      );
    }

    log(
      `Cancelling QR attendance - Device ID: ${device_id}, Username: ${username}`,
    );

    // Unlock device and invalidate cache
    const unlockResult = await unlockDevice(device_id, username);

    if (unlockResult.rows.length === 0) {
      return notFoundResponse(
        res,
        "Device not found or not locked by this user",
      );
    }

    log(`QR attendance cancelled - Device: ${device_id}, User: ${username}`);
    await invalidateQRCaches();

    return successResponse(
      res,
      unlockResult.rows[0],
      "QR attendance cancelled successfully",
    );
  } catch (error) {
    logError(error, "Error cancelling QR attendance");
    return errorResponse(res, error, "Failed to cancel QR attendance");
  }
};

const getQRStatus = async (req, res) => {
  try {
    const { device_id } = req.params;

    log(`Getting QR status - Device ID: ${device_id}`);

    const deviceQuery = `
      SELECT d.*, u.name as current_username, u.username as current_user_username
      FROM devices d 
      LEFT JOIN users u ON d.username = u.username 
      WHERE d.device_id = $1
    `;

    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    const device = deviceResult.rows[0];

    const status = {
      device_id: device.device_id,
      device_name: device.device_name,
      status: device.status,
      location: device.location,
      is_qr_mode:
        device.status === DEVICE_STATUS.IN_USE &&
        device.session_type === SESSION_TYPE.QR,
      current_user: device.username
        ? {
            username: device.username,
            name: device.current_username,
          }
        : null,
      session_start: device.session_start,
      last_seen: device.last_seen,
      qr_code: device.uid, // QR code stored in uid
    };

    return successResponse(res, status, "QR status retrieved successfully");
  } catch (error) {
    logError(error, "Error getting QR status");
    return errorResponse(res, error, "Failed to get QR status");
  }
};

module.exports = {
  processQRReading,
  cancelQRAttendance,
  getQRStatus,
};
