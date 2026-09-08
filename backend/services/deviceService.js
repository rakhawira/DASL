const pool = require("../config/database");
const { logDatabase, logError } = require("../utils/logger");
const { DEVICE_OFFLINE_TIMEOUT } = require("../config/constants");

const registerDevice = async (deviceData) => {
  try {
    const {
      device_id,
      device_name,
      location,
      ip_address,
      mac_address,
      firmware_version,
    } = deviceData;

    const query = `
      INSERT INTO devices (device_id, device_name, location, ip_address, mac_address, firmware_version, status, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, 'online', CURRENT_TIMESTAMP)
      ON CONFLICT (device_id) 
      DO UPDATE SET 
        device_name = COALESCE(EXCLUDED.device_name, devices.device_name),
        location = COALESCE(EXCLUDED.location, devices.location),
        ip_address = COALESCE(EXCLUDED.ip_address, devices.ip_address),
        mac_address = COALESCE(EXCLUDED.mac_address, devices.mac_address),
        firmware_version = COALESCE(EXCLUDED.firmware_version, devices.firmware_version),
        status = 'online',
        last_seen = CURRENT_TIMESTAMP
      RETURNING *
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

    return result.rows[0];
  } catch (error) {
    logError(error, "Error registering device");
    throw error;
  }
};

const updateDeviceHeartbeat = async (
  device_id,
  ip_address,
  status = "online",
) => {
  try {
    const query = `
      UPDATE devices 
      SET status = $1, ip_address = COALESCE($2, ip_address), last_seen = CURRENT_TIMESTAMP
      WHERE device_id = $3
      RETURNING *
    `;

    logDatabase("UPDATE", query, [status, ip_address, device_id]);
    const result = await pool.query(query, [status, ip_address, device_id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error updating device heartbeat");
    throw error;
  }
};

const getDevices = async (filters = {}) => {
  try {
    const { status, location } = filters;

    let query = `
      SELECT d.id, d.device_id, d.device_name, d.location, d.ip_address, d.mac_address, d.firmware_version, d.status, d.session_start, d.last_seen, d.created_at, d.updated_at, u.name as current_username, u.username as current_user_username
      FROM devices d 
      LEFT JOIN users u ON d.username = u.username 
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (location) {
      query += ` AND d.location ILIKE $${paramIndex}`;
      params.push(`%${location}%`);
      paramIndex++;
    }

    query += " ORDER BY d.last_seen DESC";

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

    return {
      devices: result.rows,
      stats: {
        total: parseInt(stats.total),
        online: parseInt(stats.online),
        offline: parseInt(stats.offline),
        error: parseInt(stats.error),
        in_use: parseInt(stats.in_use),
      },
    };
  } catch (error) {
    logError(error, "Error fetching devices");
    throw error;
  }
};

const getDeviceById = async (device_id) => {
  try {
    const query = `
      SELECT d.id, d.device_id, d.device_name, d.location, d.ip_address, d.mac_address, d.firmware_version, d.status, d.session_start, d.last_seen, d.created_at, d.updated_at, u.name as current_username, u.username as current_user_username
      FROM devices d 
      LEFT JOIN users u ON d.username = u.username 
      WHERE d.device_id = $1
    `;

    logDatabase("SELECT", query, [device_id]);
    const result = await pool.query(query, [device_id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error fetching device by ID");
    throw error;
  }
};

const updateDevice = async (device_id, updateData) => {
  try {
    const { device_name, location, status } = updateData;

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
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error updating device");
    throw error;
  }
};

const deleteDevice = async (device_id) => {
  try {
    const query = "DELETE FROM devices WHERE device_id = $1 RETURNING *";

    logDatabase("DELETE", query, [device_id]);
    const result = await pool.query(query, [device_id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error deleting device");
    throw error;
  }
};

const lockDevice = async (device_id, username) => {
  try {
    const device = await getDeviceById(device_id);
    if (!device) {
      return null;
    }

    if (device.status === "in_use" && device.username !== username) {
      const userQuery = "SELECT username, name FROM users WHERE username = $1";
      const userResult = await pool.query(userQuery, [device.username]);
      const currentUser = userResult.rows[0];

      throw new Error(
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

    const result = await pool.query(lockQuery, [username, device_id]);
    return result.rows[0];
  } catch (error) {
    logError(error, "Error locking device");
    throw error;
  }
};

const unlockDevice = async (device_id, username) => {
  try {
    const device = await getDeviceById(device_id);
    if (!device) {
      return null;
    }

    if (device.status === "in_use" && device.username !== username) {
      throw new Error("Cannot unlock device used by another user");
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

    const result = await pool.query(unlockQuery, [device_id]);
    return result.rows[0];
  } catch (error) {
    logError(error, "Error unlocking device");
    throw error;
  }
};

const updateDeviceStatus = async (device_id, statusData) => {
  try {
    const { status, ipAddress, currentUsername } = statusData;

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

    if (status === "in_use" && currentUsername) {
      updateQuery += `, 
          username = $${paramIndex},
          session_start = CURRENT_TIMESTAMP`;
      queryParams.push(currentUsername);
      paramIndex++;
    } else if (status === "online") {
      updateQuery += `, 
          username = NULL,
          session_start = NULL`;
    }

    updateQuery += ` WHERE device_id = $${paramIndex}`;
    queryParams.push(device_id);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error updating device status");
    throw error;
  }
};

const cleanupOfflineDevices = async (timeoutMinutes = 5) => {
  try {
    const query = `
      UPDATE devices 
      SET status = 'offline' 
      WHERE status = 'online' 
      AND last_seen < CURRENT_TIMESTAMP - INTERVAL '${timeoutMinutes} minutes'
      RETURNING *
    `;

    logDatabase("UPDATE", query);
    const result = await pool.query(query);

    return result.rows;
  } catch (error) {
    logError(error, "Error cleaning up offline devices");
    throw error;
  }
};

module.exports = {
  registerDevice,
  updateDeviceHeartbeat,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  lockDevice,
  unlockDevice,
  updateDeviceStatus,
  cleanupOfflineDevices,
};
