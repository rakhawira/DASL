const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
} = require("../utils/response");
const { attendanceEvents } = require("../services/redisPubSub");
const { invalidateCache } = require("../middleware/cache");

const getAttendanceLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      username, // Accept username parameter for frontend compatibility
      status,
      date_from,
      date_to,
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.name, u.username, u.role, u.jurusan, u.fakultas,
             TO_CHAR(al.check_time, 'DD Mon YYYY') as date,
             TO_CHAR(al.check_time, 'YYYY-MM-DD"T"HH24:MI:SS') as check_time,
             TO_CHAR(al.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at,
             al.response_time
      FROM attendance_logs al
      JOIN users u ON al.username = u.username
      WHERE 1=1
    `;

    let params = [];
    let paramIndex = 1;

    if (username) {
      query += ` AND al.username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    } else if (user_id) {
      query += ` AND al.username = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND al.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (date_from) {
      query += ` AND al.check_time >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND al.check_time <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    query += ` ORDER BY al.check_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_logs al
      JOIN users u ON al.username = u.username
      WHERE 1=1
    `;

    let countParams = [];
    let countIndex = 1;

    if (username) {
      countQuery += ` AND al.username = $${countIndex}`;
      countParams.push(username);
      countIndex++;
    } else if (user_id) {
      countQuery += ` AND al.username = $${countIndex}`;
      countParams.push(user_id);
      countIndex++;
    }

    if (status) {
      countQuery += ` AND al.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (date_from) {
      countQuery += ` AND al.check_time >= $${countIndex}`;
      countParams.push(date_from);
      countIndex++;
    }

    if (date_to) {
      countQuery += ` AND al.check_time <= $${countIndex}`;
      countParams.push(date_to);
      countIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    };

    return paginatedResponse(
      res,
      result.rows,
      pagination,
      "Attendance logs fetched successfully",
    );
  } catch (error) {
    logError(error, "Error fetching attendance logs");
    return errorResponse(res, error, "Failed to fetch attendance logs");
  }
};

const createAttendanceLog = async (req, res) => {
  try {
    log("Processing attendance log creation");
    const {
      username,
      name,
      status,
      location,
      device_info,
      ip_address,
      timestamp,
      device_uid,
      device_name,
      response_time,
    } = req.body;

    if (!username) {
      log(`Attendance log failed - Missing username`);
      return validationErrorResponse(res, null, "Username is required");
    }

    log(
      `Creating attendance log - Username: ${username}, Name: ${name || "N/A"}, Status: ${status || "present"}, Device UID: ${device_uid || "N/A"}, Timestamp: ${timestamp}`,
    );

    const query = `
      INSERT INTO attendance_logs (username, name, status, location, device_info, ip_address, timestamp, date, check_time, device_uid, device_name, response_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP), $10, $11, $12)
      RETURNING *
    `;

    const params = [
      username,
      name,
      status || "present",
      location,
      device_info,
      ip_address,
      timestamp,
      timestamp
        ? new Date(timestamp).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          })
        : new Date().toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Jakarta",
          }),
      timestamp ? new Date(timestamp).toISOString() : null,
      device_uid,
      device_name,
      response_time,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);
    log(
      `Attendance log created successfully - ID: ${result.rows[0].id}, Device UID: ${device_uid || "N/A"}`,
    );

    // Invalidate cache
    await invalidateCache("cache:/api/attendance-logs*");
    await invalidateCache("cache:/api/attendance-stats*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    if (device_uid) {
      await invalidateCache(
        `cache:/api/attendance-logs/by-device-uid/${device_uid}*`,
      );
    }

    // Publish attendance event to Redis
    await attendanceEvents.publishAttendanceResult({
      deviceId: device_uid,
      success: true,
      attendanceData: result.rows[0],
    });

    return successResponse(
      res,
      result.rows[0],
      "Attendance log created successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error creating attendance log");
    return errorResponse(res, error, "Failed to create attendance log");
  }
};

const getAttendanceStats = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const today = new Date()
      .toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .split("/")
      .reverse()
      .join("-");

    let todayQuery = `
      SELECT 
        COUNT(DISTINCT username) as today_count
      FROM attendance_logs
      WHERE DATE(check_time) = $1
      AND status IN ('present', 'late', 'excused')
    `;

    const todayResult = await pool.query(todayQuery, [today]);
    const todayCount = parseInt(todayResult.rows[0]?.today_count) || 0;

    let query = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused,
        COUNT(DISTINCT username) as unique_users
      FROM attendance_logs
      WHERE 1=1
    `;

    let params = [];
    let paramIndex = 1;

    if (date_from) {
      query += ` AND DATE(check_time) >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND DATE(check_time) <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    const statsData = {
      ...result.rows[0],
      today_count: todayCount,
    };

    return successResponse(
      res,
      statsData,
      "Attendance statistics fetched successfully",
    );
  } catch (error) {
    logError(error, "Error fetching attendance stats");
    return errorResponse(res, error, "Failed to fetch attendance statistics");
  }
};

const getAttendanceByDeviceUID = async (req, res) => {
  try {
    const { device_uid } = req.params;

    if (!device_uid) {
      return validationErrorResponse(res, null, "Device UID is required");
    }

    log(`Fetching attendance logs for device UID: ${device_uid}`);

    const query = `
      SELECT 
        al.id,
        al.username,
        al.status,
        al.location,
        al.device_info,
        al.device_name,
        al.ip_address,
        al.timestamp,
        al.date,
        al.check_time,
        al.device_uid,
        al.created_at,
        al.response_time,
        u.username,
        u.name as user_name
      FROM attendance_logs al
      JOIN users u ON al.username = u.username
      WHERE al.device_uid = $1
      ORDER BY al.check_time DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [device_uid]);

    return successResponse(
      res,
      result.rows,
      `Attendance logs for device UID ${device_uid} fetched successfully`,
    );
  } catch (error) {
    logError(error, "Error fetching attendance by device UID");
    return errorResponse(
      res,
      error,
      "Failed to fetch attendance by device UID",
    );
  }
};

module.exports = {
  getAttendanceLogs,
  getAttendanceStats,
  createAttendanceLog,
  getAttendanceByDeviceUID,
};
