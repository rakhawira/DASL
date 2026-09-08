const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

const triggerNFCAttendance = async (req, res) => {
  try {
    log("Processing NFC trigger request from User A");
    const { username, device_id, name, user_data } = req.body; // Use username and name

    if (!username || !device_id) {
      log(`NFC trigger failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Username and Device ID are required",
      );
    }

    log(`NFC trigger - Username: ${username}, Device ID: ${device_id}`);

    // Check if device exists and is online
    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    const device = deviceResult.rows[0];

    // Check if device is already in use by another user
    if (device.status === "in_use" && device.username !== username) {
      return errorResponse(
        res,
        null,
        "Device is currently in use by another user",
        409,
      );
    }

    if (device.status !== "online" && device.status !== "in_use") {
      return errorResponse(
        res,
        null,
        "Device is not available for NFC attendance",
        400,
      );
    }

    // Update device status to in_use (locked for User B)
    const updateDeviceQuery = `
      UPDATE devices 
      SET status = 'in_use',
          username = $1,
          name = $2,
          session_start = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $3
      RETURNING *
    `;

    const updateResult = await pool.query(updateDeviceQuery, [
      username, // Username (NIM)
      name, // Full name
      device_id,
    ]);

    log(
      `Device locked for NFC attendance - ID: ${device_id}, User: ${username}`,
    );

    // Here you would send the payload to ESP32
    // For now, we'll simulate the successful trigger
    const payload = {
      action: "nfc_trigger",
      username: username, // Use username instead of user_id
      user_data: user_data || {},
      device_id: device_id,
      timestamp: Date.now(),
      status: "waiting_for_nfc",
    };

    return successResponse(
      res,
      {
        device: updateResult.rows[0],
        payload: payload,
        message: "NFC trigger sent to device successfully",
      },
      "NFC attendance triggered - Waiting for NFC tap",
      200,
    );
  } catch (error) {
    logError(error, "Error triggering NFC attendance");
    return errorResponse(res, error, "Failed to trigger NFC attendance");
  }
};

const processNFCReading = async (req, res) => {
  try {
    log("Processing NFC reading from ESP32");
    const { device_id, nfc_data, username, name, timestamp } = req.body;

    if (!device_id || !nfc_data || !username) {
      log(`NFC reading failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Device ID, NFC data, and Username are required",
      );
    }

    log(
      `NFC reading - Device ID: ${device_id}, Username: ${username}, NFC: ${nfc_data}`,
    );

    // Record start time for response time calculation
    const requestStartTime = Date.now();

    // Verify device exists (removed status check to allow Arduino to send attendance directly)
    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    // Get user information from request (Arduino sends username and name directly)
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
      VALUES ($1, $2, 'present', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10)
      RETURNING *
    `;

    const attendanceParams = [
      user.username,
      user.name,
      deviceResult.rows[0].location || "Unknown",
      device_id,
      deviceResult.rows[0].ip_address,
      Date.now(), // timestamp in milliseconds (backend time)
      new Date().toISOString().split("T")[0], // date in YYYY-MM-DD format (backend time)
      nfc_data, // device_uid
      deviceResult.rows[0].device_name || "ESP32 Device", // device_name
      null, // response_time will be calculated after database insert
    ];

    console.log("[Backend] Using backend timestamp:", {
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
    const responseTimeStr =
      responseTimeMs < 1000
        ? `${responseTimeMs}ms`
        : `${(responseTimeMs / 1000).toFixed(2)}s`;

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
      `Attendance created successfully - User: ${user.name}, Device: ${device_id}, Response Time: ${responseTimeStr}`,
    );

    // Invalidate cache
    await invalidateCache("cache:/api/attendance-logs*");
    await invalidateCache("cache:/api/attendance-stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    // Update device status back to online (unlock for User B)
    const unlockDeviceQuery = `
      UPDATE devices
      SET status = 'online',
          username = NULL,
          session_start = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $1
      RETURNING *
    `;

    const unlockResult = await pool.query(unlockDeviceQuery, [device_id]);

    log(`Device unlocked after successful attendance - ID: ${device_id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/nfc/*");
    await invalidateCache("cache:/api/devices/*");

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
        nfc_data: nfc_data,
        timestamp: new Date().toISOString(),
        response_time: responseTimeStr,
      },
      "NFC attendance completed successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error processing NFC reading");
    return errorResponse(res, error, "Failed to process NFC reading");
  }
};

const cancelNFCAttendance = async (req, res) => {
  try {
    const { device_id, username } = req.body; // Use username instead of user_id

    if (!device_id || !username) {
      return validationErrorResponse(
        res,
        null,
        "Device ID and Username are required",
      );
    }

    log(
      `Cancelling NFC attendance - Device ID: ${device_id}, Username: ${username}`,
    );

    // Update device status back to online
    const unlockDeviceQuery = `
      UPDATE devices 
      SET status = 'online',
          username = NULL,
          session_start = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $1 AND username = $2
      RETURNING *
    `;

    const unlockResult = await pool.query(unlockDeviceQuery, [
      device_id,
      username, // Use username instead of user_id
    ]);

    if (unlockResult.rows.length === 0) {
      return notFoundResponse(
        res,
        "Device not found or not locked by this user",
      );
    }

    log(`NFC attendance cancelled - Device: ${device_id}, User: ${username}`);

    // Invalidate cache
    await invalidateCache("cache:/api/nfc/*");
    await invalidateCache("cache:/api/devices/*");

    return successResponse(
      res,
      unlockResult.rows[0],
      "NFC attendance cancelled successfully",
    );
  } catch (error) {
    logError(error, "Error cancelling NFC attendance");
    return errorResponse(res, error, "Failed to cancel NFC attendance");
  }
};

const getNFCStatus = async (req, res) => {
  try {
    const { device_id } = req.params;

    log(`Getting NFC status - Device ID: ${device_id}`);

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
      is_nfc_mode: device.status === "in_use",
      current_user: device.username
        ? {
            username: device.username,
            name: device.name,
          }
        : null,
      session_start: device.session_start,
      last_seen: device.last_seen,
    };

    return successResponse(res, status, "NFC status retrieved successfully");
  } catch (error) {
    logError(error, "Error getting NFC status");
    return errorResponse(res, error, "Failed to get NFC status");
  }
};

module.exports = {
  processNFCReading,
  cancelNFCAttendance,
  getNFCStatus,
};
