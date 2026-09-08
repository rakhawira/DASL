const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const axios = require("axios");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  conflictResponse,
} = require("../utils/response");
const { isValidDeviceStatus } = require("../utils/validation");
const { DEVICE_OFFLINE_TIMEOUT } = require("../config/constants");
const websocketService = require("../services/websocketService");
const { deviceEvents } = require("../services/redisPubSub");
const { invalidateCache } = require("../middleware/cache");
const { v4: uuidv4 } = require("uuid");

const registerDevice = async (req, res) => {
  try {
    log("Processing ESP32 device registration");
    const {
      device_id,
      device_name,
      location,
      ip_address,
      mac_address,
      firmware_version,
    } = req.body;

    if (!device_id) {
      log(`Device registration failed - Missing device_id`);
      return validationErrorResponse(res, null, "Device ID is required");
    }

    log(
      `Registering ESP32 device - ID: ${device_id}, Name: ${device_name || "Unnamed"}`,
    );

    const query = `
      INSERT INTO devices (device_id, device_name, location, ip_address, mac_address, firmware_version, status, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, 'online', NOW())
      ON CONFLICT (device_id) DO NOTHING
      RETURNING *;
    `;

    const params = [
      device_id,
      device_name || null,
      location || null,
      ip_address || null,
      mac_address || null,
      firmware_version || null,
    ];

    logDatabase("INSERT/UPDATE", query, params);
    const result = await pool.query(query, params);
    log(`ESP32 device registered/updated successfully - ID: ${device_id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    // Publish device online event to Redis
    await deviceEvents.publishDeviceOnline({
      deviceId: device_id,
      deviceName: device_name,
      location,
      ip_address,
    });

    return successResponse(
      res,
      result.rows[0],
      "Device registered successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error registering ESP32 device");
    return errorResponse(res, error, "Failed to register device");
  }
};

const deviceHeartbeat = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { ip_address, status = "online" } = req.body;

    if (!device_id) {
      return validationErrorResponse(res, null, "Device ID is required");
    }

    log(`Device heartbeat - ID: ${device_id}, Status: ${status}`);

    const query = `
      UPDATE devices 
      SET status = $1, ip_address = COALESCE($2, ip_address), last_seen = CURRENT_TIMESTAMP
      WHERE device_id = $3
      RETURNING *
    `;

    logDatabase("UPDATE", query, [status, ip_address, device_id]);
    const result = await pool.query(query, [status, ip_address, device_id]);

    if (result.rows.length === 0) {
      log(`Heartbeat failed - Device not found: ${device_id}`);
      return notFoundResponse(res, "Device not found");
    }

    // Invalidate cache for device
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    // Publish device heartbeat event to Redis
    await deviceEvents.publishDeviceHeartbeat({
      deviceId: device_id,
      status,
      ip_address,
    });

    return successResponse(res, result.rows[0], "Device heartbeat updated");
  } catch (error) {
    logError(error, "Error updating device heartbeat");
    return errorResponse(res, error, "Failed to update heartbeat");
  }
};

// Check devices based on heartbeat and mark offline if no recent heartbeat
const checkHeartbeatBasedOffline = async () => {
  try {
    const query = `
      UPDATE devices 
      SET status = 'offline' 
      WHERE status = 'online' 
      AND last_seen < CURRENT_TIMESTAMP - INTERVAL '${DEVICE_OFFLINE_TIMEOUT} milliseconds'
      RETURNING *
    `;

    logDatabase("UPDATE", query, []);
    const result = await pool.query(query);

    if (result.rows.length > 0) {
      log(
        `Marked ${result.rows.length} devices as offline (no heartbeat for ${DEVICE_OFFLINE_TIMEOUT}ms)`,
      );

      // Invalidate cache for devices
      await invalidateCache("cache:/api/devices*");
      await invalidateCache("cache:/api/devices/stats*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

      result.rows.forEach(async (device) => {
        log(
          `Device ${device.device_id} marked offline (last heartbeat: ${device.last_seen})`,
        );
        // Publish device offline event to Redis
        await deviceEvents.publishDeviceOffline({
          deviceId: device.device_id,
          deviceName: device.device_name,
        });
      });
    }

    return result.rows;
  } catch (error) {
    logError(error, "Error in heartbeat-based offline detection");
    return [];
  }
};

const getDevices = async (req, res) => {
  try {
    log("Fetching ESP32 devices list for admin dashboard");
    const { status, location } = req.query;

    let query =
      "SELECT d.id, d.device_id, d.device_name, d.location, d.ip_address, d.mac_address, d.firmware_version, d.status, d.session_start, d.last_seen, d.created_at, d.updated_at, u.name as current_username, u.username as current_user_username FROM devices d LEFT JOIN users u ON d.username = u.username WHERE 1=1";

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (location) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += " ORDER BY last_seen DESC";

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error,
        COUNT(CASE WHEN status = 'in_use' THEN 1 END) as in_use
      FROM devices
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    log(
      `Retrieved ${result.rowCount} devices - Online: ${stats.online}, Offline: ${stats.offline}, Error: ${stats.error}, In Use: ${stats.in_use}`,
    );

    const deviceStats = {
      total: parseInt(stats.total),
      online: parseInt(stats.online),
      offline: parseInt(stats.offline),
      error: parseInt(stats.error),
      in_use: parseInt(stats.in_use),
    };

    return successResponse(
      res,
      {
        devices: result.rows,
        stats: {
          total: parseInt(stats.total),
          online: parseInt(stats.online),
          offline: parseInt(stats.offline),
          error: parseInt(stats.error),
          in_use: parseInt(stats.in_use),
        },
      },
      "Devices fetched successfully",
    );
  } catch (error) {
    logError(error, "Error fetching devices");
    return errorResponse(res, error, "Failed to fetch devices");
  }
};

const getDeviceById = async (req, res) => {
  try {
    const { device_id } = req.params;

    log(`Fetching device details - ID: ${device_id}`);

    const query =
      "SELECT d.id, d.device_id, d.device_name, d.location, d.ip_address, d.mac_address, d.firmware_version, d.status, d.session_start, d.last_seen, d.created_at, d.updated_at, u.name as current_username, u.username as current_user_username FROM devices d LEFT JOIN users u ON d.username = u.username WHERE d.device_id = $1";

    logDatabase("SELECT", query, [device_id]);
    const result = await pool.query(query, [device_id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    return successResponse(res, result.rows[0], "Device fetched successfully");
  } catch (error) {
    logError(error, "Error fetching device");
    return errorResponse(res, error, "Failed to fetch device");
  }
};

const updateDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { device_name, location, status } = req.body;

    log(`Updating device - ID: ${device_id}`);

    const query = `
      UPDATE devices 
      SET device_name = COALESCE($1, device_name),
          location = COALESCE($2, location),
          status = COALESCE($3, status)
      WHERE device_id = $4
      RETURNING *
    `;

    logDatabase("UPDATE", query, [device_name, location, status, device_id]);
    const result = await pool.query(query, [
      device_name,
      location,
      status,
      device_id,
    ]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    log(`Device updated successfully - ID: ${device_id}`);
    return successResponse(res, result.rows[0], "Device updated successfully");
  } catch (error) {
    logError(error, "Error updating device");
    return errorResponse(res, error, "Failed to update device");
  }
};

const deleteDevice = async (req, res) => {
  try {
    const { device_id } = req.params;

    log(`Removing device - ID: ${device_id}`);

    const query = "DELETE FROM devices WHERE device_id = $1 RETURNING *";

    logDatabase("DELETE", query, [device_id]);
    const result = await pool.query(query, [device_id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    log(`Device removed successfully - ID: ${device_id}`);
    return successResponse(res, result.rows[0], "Device removed successfully");
  } catch (error) {
    logError(error, "Error removing device");
    return errorResponse(res, error, "Failed to remove device");
  }
};

const cleanupOfflineDevices = async (req, res) => {
  try {
    const { timeout_minutes = 5 } = req.body;

    log(`Cleaning up offline devices - Timeout: ${timeout_minutes} minutes`);

    const query = `
      UPDATE devices 
      SET status = 'offline' 
      WHERE status = 'online' 
      AND last_seen < CURRENT_TIMESTAMP - INTERVAL '${timeout_minutes} minutes'
      RETURNING *
    `;

    logDatabase("UPDATE", query);
    const result = await pool.query(query);

    return successResponse(
      res,
      result.rows,
      `Marked ${result.rowCount} devices as offline`,
    );
  } catch (error) {
    logError(error, "Error cleaning up offline devices");
    return errorResponse(res, error, "Failed to cleanup offline devices");
  }
};

const lockDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { username } = req.body; // Only need username

    log(`Attempting to lock device - ID: ${device_id}, User: ${username}`);

    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    const device = deviceResult.rows[0];

    if (device.status === "in_use" && device.username !== user_id) {
      const userQuery = "SELECT username, name FROM users WHERE username = $1";
      const userResult = await pool.query(userQuery, [device.username]);
      const currentUser = userResult.rows[0];

      return conflictResponse(
        res,
        `Device sedang digunakan oleh ${currentUser?.name || currentUser?.username || "User lain"}`,
      );
    }

    const lockQuery = `
      UPDATE devices 
      SET status = 'in_use',
          username = $1,
          session_start = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $2
      RETURNING *
    `;

    const lockResult = await pool.query(lockQuery, [username, device_id]);

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    log(`Device locked successfully - ID: ${device_id}, User: ${username}`);

    return successResponse(
      res,
      lockResult.rows[0],
      "Device locked successfully",
    );
  } catch (error) {
    logError(error, "Error locking device");
    return errorResponse(res, error, "Failed to lock device");
  }
};

const unlockDevice = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { username } = req.body; // Use username instead of user_id

    log(`Attempting to unlock device - ID: ${device_id}, User: ${username}`);

    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    const device = deviceResult.rows[0];

    if (device.status === "in_use" && device.username !== username) {
      return conflictResponse(res, "Cannot unlock device used by another user");
    }

    const unlockQuery = `
      UPDATE devices 
      SET status = 'online',
          username = NULL,
          session_start = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $1
      RETURNING *
    `;

    const unlockResult = await pool.query(unlockQuery, [device_id]);

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    log(`Device unlocked successfully - ID: ${device_id}, User: ${username}`);

    return successResponse(
      res,
      unlockResult.rows[0],
      "Device unlocked successfully",
    );
  } catch (error) {
    logError(error, "Error unlocking device");
    return errorResponse(res, error, "Failed to unlock device");
  }
};

const updateDeviceStatus = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { status, message, username, ipAddress } = req.body; // Use username as primary identifier

    log(`[DEBUG] Request body: ${JSON.stringify(req.body)}`);

    if (!status) {
      return validationErrorResponse(res, null, "Status is required");
    }

    if (!isValidDeviceStatus(status)) {
      return validationErrorResponse(
        res,
        null,
        `Invalid status. Must be one of: online, offline, in_use, maintenance, error`,
      );
    }

    log(
      `ESP32 status update - Device: ${device_id}, Status: ${status}, Message: ${message}`,
    );

    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    let updateQuery = `
      UPDATE devices 
      SET status = $1,
          last_seen = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
    `;

    let queryParams = [status];
    let paramIndex = 2;

    if (ipAddress) {
      updateQuery += `, ip_address = $${paramIndex}`;
      queryParams.push(ipAddress);
      paramIndex++;
    }

    if (status === "in_use" && username) {
      updateQuery += `, 
          username = $${paramIndex},
          session_start = CURRENT_TIMESTAMP`;
      queryParams.push(username);
      paramIndex++;
    } else if (status === "online") {
      updateQuery += `, 
          username = NULL,
          session_start = NULL`;
    }

    updateQuery += ` WHERE device_id = $${paramIndex}`;
    queryParams.push(device_id);

    const updateResult = await pool.query(updateQuery, queryParams);

    // Invalidate cache
    await invalidateCache("cache:/api/devices*");
    await invalidateCache("cache:/api/devices/stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    await invalidateCache(`cache:/api/devices/${device_id}*`);

    log(
      `Device status updated in database - ID: ${device_id}, Status: ${status}`,
    );

    return successResponse(
      res,
      {
        device_id: device_id,
        status: status,
        message: message,
        timestamp: new Date().toISOString(),
      },
      "Device status updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating device status from ESP32");
    return errorResponse(res, error, "Failed to update device status");
  }
};

const getDeviceStats = async (req, res) => {
  try {
    log("Processing device statistics request");

    const queries = await Promise.all([
      // Total devices
      pool.query("SELECT COUNT(*) as total FROM devices"),

      // Online devices
      pool.query(`
        SELECT COUNT(*) as online 
        FROM devices 
        WHERE status = 'online'
      `),

      // Offline devices
      pool.query(`
        SELECT COUNT(*) as offline 
        FROM devices 
        WHERE status = 'offline'
      `),

      // Error devices
      pool.query(`
        SELECT COUNT(*) as error 
        FROM devices 
        WHERE status = 'error'
      `),

      // Devices by location
      pool.query(`
        SELECT location, COUNT(*) as count
        FROM devices 
        WHERE location IS NOT NULL
        GROUP BY location
        ORDER BY count DESC
        LIMIT 5
      `),

      // Recent devices
      pool.query(`
        SELECT *
        FROM devices 
        ORDER BY last_heartbeat DESC
        LIMIT 10
      `),
    ]);

    const stats = {
      total: parseInt(queries[0].rows[0].total),
      online: parseInt(queries[1].rows[0].online),
      offline: parseInt(queries[2].rows[0].offline),
      error: parseInt(queries[3].rows[0].error),
      by_location: queries[4].rows,
      recent_devices: queries[5].rows.map((row) => ({
        ...row,
        is_online: row.status === "online",
        last_heartbeat: row.last_heartbeat,
      })),
    };

    return successResponse(
      res,
      stats,
      "Device statistics retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching device statistics");
    return errorResponse(res, error, "Failed to fetch device statistics");
  }
};

const triggerNFCAttendance = async (req, res) => {
  try {
    const { device_id } = req.params;
    const { username } = req.body; // Hanya perlu username

    log(`NFC trigger request - Device: ${device_id}, User: ${username}`);

    if (!username) {
      return validationErrorResponse(res, null, "Username is required");
    }

    // Race condition guard: Check current device status first
    const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found");
    }

    const device = deviceResult.rows[0];

    // Check if device is online
    if (device.status !== "online") {
      return conflictResponse(
        res,
        `Device is not online. Current status: ${device.status}`,
      );
    }

    // Race condition guard: Check if device is already in use by another user
    if (device.status === "in_use") {
      const userQuery = "SELECT username, name FROM users WHERE username = $1";
      const userResult = await pool.query(userQuery, [device.username]);
      const currentUser = userResult.rows[0];

      return conflictResponse(
        res,
        `Device sedang digunakan oleh ${currentUser?.name || currentUser?.username || "User lain"}`,
      );
    }

    // Use transaction to ensure atomic operation
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Double-check device status within transaction
      const checkQuery =
        "SELECT * FROM devices WHERE device_id = $1 FOR UPDATE";
      const checkResult = await client.query(checkQuery, [device_id]);
      const currentDevice = checkResult.rows[0];

      // Final race condition check
      if (currentDevice.status !== "online") {
        await client.query("ROLLBACK");
        return conflictResponse(
          res,
          `Device is not online. Current status: ${currentDevice.status}`,
        );
      }

      if (currentDevice.status === "in_use") {
        await client.query("ROLLBACK");
        const userQuery =
          "SELECT username, name FROM users WHERE username = $1";
        const userResult = await client.query(userQuery, [
          currentDevice.username,
        ]);
        const currentUser = userResult.rows[0];

        return conflictResponse(
          res,
          `Device sedang digunakan oleh ${currentUser?.name || currentUser?.username || "User lain"}`,
        );
      }

      // Update device status to in_use atomically
      const lockQuery = `
        UPDATE devices 
        SET status = 'in_use',
            username = $1,
            session_start = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE device_id = $2
        RETURNING *
      `;

      const lockResult = await client.query(lockQuery, [username, device_id]);

      await client.query("COMMIT");

      log(
        `Device locked for NFC attendance - ID: ${device_id}, User: ${username}`,
      );

      // Update session type to NFC
      await client.query(
        `UPDATE devices SET session_type = 'nfc' WHERE device_id = $1`,
        [device_id],
      );

      // Invalidate cache for device
      await invalidateCache("cache:/api/devices*");
      await invalidateCache("cache:/api/devices/stats*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
      await invalidateCache(`cache:/api/devices/${device_id}*`);

      // NFC trigger will be sent via HTTP polling (getPendingCommands)
      // No need for WebSocket trigger

      return successResponse(
        res,
        {
          device_id: device_id,
          username: username,
          status: "nfc_reading_started",
          message: "NFC reading started successfully",
          timestamp: new Date().toISOString(),
        },
        "NFC attendance trigger successful",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(error, "Error triggering NFC attendance");
    return errorResponse(res, error, "Failed to trigger NFC attendance");
  }
};

// Trigger QR attendance on device
const triggerQRAttendance = async (req, res) => {
  const { device_id } = req.params;
  const { username, name } = req.body;

  if (!device_id || !username) {
    return validationErrorResponse(
      res,
      null,
      "Device ID and username are required",
    );
  }

  try {
    log(`Processing QR attendance trigger for device: ${device_id}`);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if device exists and is online
      const checkQuery = `
        SELECT *
        FROM devices
        WHERE device_id = $1
        FOR UPDATE
      `;
      const checkResult = await client.query(checkQuery, [device_id]);

      if (checkResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return notFoundResponse(res, "Device not found");
      }

      const currentDevice = checkResult.rows[0];

      if (currentDevice.status !== "online") {
        await client.query("ROLLBACK");
        return conflictResponse(
          res,
          `Device is not online. Current status: ${currentDevice.status}`,
        );
      }

      if (currentDevice.status === "in_use") {
        await client.query("ROLLBACK");
        const userQuery =
          "SELECT username, name FROM users WHERE username = $1";
        const userResult = await client.query(userQuery, [
          currentDevice.username,
        ]);
        const currentUser = userResult.rows[0];

        return conflictResponse(
          res,
          `Device sedang digunakan oleh ${currentUser?.name || currentUser?.username || "User lain"}`,
        );
      }

      // Generate random QR code (random number like UID)
      const qrCode = uuidv4().replace(/-/g, "").substring(0, 13).toUpperCase();
      const timestamp = Date.now();
      const expiresAt = timestamp + 10 * 1000; // 10 seconds expiry

      // Update device status to in_use atomically with QR session data
      const lockQuery = `
        UPDATE devices 
        SET status = 'in_use',
            username = $1,
            session_start = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            session_type = 'qr',
            uid = $3
        WHERE device_id = $2
        RETURNING *
      `;

      const lockResult = await client.query(lockQuery, [
        username,
        device_id,
        qrCode,
      ]);

      await client.query("COMMIT");

      log(
        `Device locked for QR attendance - ID: ${device_id}, User: ${username}, QR: ${qrCode}`,
      );

      // QR code will be sent via HTTP polling (getPendingCommands)
      // No need for WebSocket trigger

      // Invalidate cache for device (after successful trigger)
      await invalidateCache("cache:/api/devices*");
      await invalidateCache("cache:/api/devices/stats*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
      await invalidateCache(`cache:/api/devices/${device_id}*`);

      return successResponse(
        res,
        {
          device_id: device_id,
          username: username,
          qr_code: qrCode,
          status: "qr_displaying",
          message: "QR code generated and sent to device",
          timestamp: new Date(timestamp).toISOString(),
          expires_at: new Date(expiresAt).toISOString(),
        },
        "QR attendance trigger successful",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(error, "Error triggering QR attendance");
    return errorResponse(res, error, "Failed to trigger QR attendance");
  }
};

// Command polling functions
const getPendingCommands = async (req, res) => {
  try {
    const { device_id } = req.params;

    if (!device_id) {
      return validationErrorResponse(res, null, "Device ID is required");
    }

    log(`Getting pending commands for device: ${device_id}`);

    // Get device with pending command status and user info
    const query = `
      SELECT
        d.device_id,
        d.status,
        d.username,
        d.session_start,
        d.session_type,
        d.uid,
        u.username as user_username,
        u.name,
        d.updated_at
      FROM devices d
      LEFT JOIN users u ON d.username = u.username AND d.username IS NOT NULL
      WHERE d.device_id = $1
        AND d.status = 'in_use'
      ORDER BY d.updated_at ASC
      LIMIT 10
    `;

    const result = await pool.query(query, [device_id]);

    if (result.rows.length === 0) {
      return successResponse(
        res,
        { commands: [] },
        `No pending commands for device ${device_id}`,
      );
    }

    // Format command for ESP32 based on session type
    const commands = result.rows.map((device) => ({
      id: device.updated_at, // Use timestamp as ID
      type:
        device.session_type === "qr" ? "start_qr_display" : "start_nfc_reading",
      data: {
        username: device.user_username || device.username || "Unknown User",
        name: device.name || "Unknown Name",
        timestamp: device.updated_at,
        qrCode: device.uid || null, // Include QR code if session type is QR
      },
      timestamp: device.updated_at,
    }));

    return successResponse(
      res,
      { commands },
      `Found ${commands.length} pending commands for device ${device_id}`,
    );
  } catch (error) {
    logError(error, "Error getting pending commands");
    return errorResponse(res, error, "Failed to get pending commands");
  }
};

const acknowledgeCommand = async (req, res) => {
  try {
    const { device_id, command_id } = req.params;

    if (!device_id || !command_id) {
      return validationErrorResponse(
        res,
        null,
        "Device ID and Command ID are required",
      );
    }

    log(`Acknowledging command ${command_id} for device ${device_id}`);

    // Get the current device info including QR code (uid)
    const getDeviceQuery = `
      SELECT device_id, uid, session_type, username
      FROM devices
      WHERE device_id = $1 AND status = 'in_use'
    `;
    const deviceResult = await pool.query(getDeviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, "Device not found or not in use");
    }

    const device = deviceResult.rows[0];
    const qrCode = device.uid; // QR code stored in uid

    // Update device status back to online and clear user session
    const query = `
      UPDATE devices
      SET status = 'online',
          username = NULL,
          session_start = NULL,
          session_type = NULL,
          uid = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE device_id = $1
        AND status = 'in_use'
    `;

    const result = await pool.query(query, [device_id]);

    if (result.rowCount === 0) {
      return notFoundResponse(res, "Device not found or not in use");
    }

    // WebSocket notification removed - using HTTP polling instead

    return successResponse(
      res,
      { commandId: command_id, deviceId: device_id },
      `Command ${command_id} acknowledged successfully`,
    );
  } catch (error) {
    logError(error, "Error acknowledging command");
    return errorResponse(res, error, "Failed to acknowledge command");
  }
};

const handleCommandResponse = async (req, res) => {
  try {
    const { device_id, command_id } = req.params;
    const { success, message, timestamp, status } = req.body;

    if (!device_id || !command_id) {
      return validationErrorResponse(
        res,
        null,
        "Device ID and Command ID are required",
      );
    }

    log(
      `Processing command response from device: ${device_id}, Command: ${command_id}`,
    );

    // Find the device
    const deviceQuery = `
      SELECT device_id, status, username, session_start
      FROM devices 
      WHERE device_id = $1
    `;

    const deviceResult = await pool.query(deviceQuery, [device_id]);

    if (deviceResult.rows.length === 0) {
      return notFoundResponse(res, null, `Device ${device_id} not found`);
    }

    const device = deviceResult.rows[0];

    // Log the command response
    logDatabase(
      `Command Response - Device: ${device_id}, Command: ${command_id}, Success: ${success}, Message: ${message}`,
    );

    // Update device status based on response
    if (status) {
      const updateQuery = `
        UPDATE devices 
        SET last_seen = CURRENT_TIMESTAMP,
            username = COALESCE($2, username),
            session_start = COALESCE($3, session_start)
        WHERE device_id = $1
      `;

      await pool.query(updateQuery, [
        device_id,
        status.username || null,
        status.nfcReading ? new Date() : null,
      ]);
    }

    // Emit device status update via WebSocket (for status only, not commands)
    const websocketService = require("../services/websocketService");
    if (websocketService && websocketService.io) {
      websocketService.io.emit("device_status", {
        deviceId: device_id,
        status: device.status,
        currentUser: username || null,
        timestamp: new Date().toISOString(),
        nfcReading: status?.nfcReading || false,
        nfcReady: status?.nfcReady || false,
      });
    }

    return successResponse(
      res,
      {
        deviceId: device_id,
        commandId: command_id,
        acknowledged: true,
        timestamp: new Date().toISOString(),
      },
      `Command response processed successfully for device ${device_id}`,
    );
  } catch (error) {
    logError(error, "Error handling command response");
    return errorResponse(res, error, "Failed to handle command response");
  }
};

module.exports = {
  registerDevice,
  deviceHeartbeat,
  checkHeartbeatBasedOffline,
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
};
