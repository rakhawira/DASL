const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

const getScheduleRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if schedule_requests table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_requests'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Create schedule_requests table with foreign key to courses
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schedule_requests (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          course_name VARCHAR(255) NOT NULL,
          course_code VARCHAR(255) NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          end_time VARCHAR(10) NOT NULL,
          room VARCHAR(255) NOT NULL,
          requested_by VARCHAR(255) NOT NULL,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          approved_by VARCHAR(255),
          approved_at TIMESTAMP,
          rejection_reason TEXT,
          original_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_requests(status);
        CREATE INDEX IF NOT EXISTS idx_schedule_requests_requested_by ON schedule_requests(requested_by);
        CREATE INDEX IF NOT EXISTS idx_schedule_requests_course_id ON schedule_requests(course_id);
        CREATE INDEX IF NOT EXISTS idx_schedule_requests_requested_at ON schedule_requests(requested_at);
      `);
    }

    let query = `
      SELECT *
      FROM schedule_requests
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY requested_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM schedule_requests
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
      pages: Math.ceil(total / limit),
    };

    return paginatedResponse(
      res,
      result.rows,
      pagination,
      "Schedule requests retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching schedule requests");
    return errorResponse(res, error, "Failed to fetch schedule requests");
  }
};

const createScheduleRequest = async (req, res) => {
  try {
    log("Processing schedule request creation");
    const {
      course_id,
      course_name,
      course_code,
      start_time,
      end_time,
      room,
      requested_by,
      original_data,
    } = req.body;

    if (
      !course_id ||
      !course_name ||
      !course_code ||
      !start_time ||
      !end_time ||
      !room ||
      !requested_by
    ) {
      log(`Schedule request creation failed - Missing required fields`);
      return validationErrorResponse(res, null, "All fields are required");
    }

    log(
      `Creating schedule request - Course ID: ${course_id}, Requested by: ${requested_by}`,
    );

    const query = `
      INSERT INTO schedule_requests (course_id, course_name, course_code, start_time, end_time, room, requested_by, original_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      course_id,
      course_name,
      course_code,
      start_time,
      end_time,
      room,
      requested_by,
      original_data ? JSON.stringify(original_data) : null,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);
    log(`Schedule request created successfully - ID: ${result.rows[0].id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/schedule-requests/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Schedule request created successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error creating schedule request");
    return errorResponse(res, error, "Failed to create schedule request");
  }
};

const updateScheduleRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by, rejection_reason } = req.body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return validationErrorResponse(
        res,
        null,
        "Status must be either 'approved' or 'rejected'",
      );
    }

    // First get the schedule request to get the data
    const getRequestQuery = "SELECT * FROM schedule_requests WHERE id = $1";
    const requestResult = await pool.query(getRequestQuery, [id]);

    if (requestResult.rows.length === 0) {
      return notFoundResponse(res, "Schedule request not found");
    }

    const scheduleRequest = requestResult.rows[0];

    // Update the schedule request status
    const updateQuery = `
      UPDATE schedule_requests 
      SET status = $2,
          approved_by = $3,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      id,
      status,
      approved_by || null,
      status === "rejected" ? rejection_reason : null,
    ];

    const result = await pool.query(updateQuery, params);

    // If approved, we need to update the actual schedule data
    // For now, since schedules are stored in memory/frontend, we'll just return the approved request
    // In a real implementation, you would update the actual schedule table here

    // Invalidate cache
    await invalidateCache("cache:/api/schedule-requests/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Schedule request status updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating schedule request status");
    return errorResponse(
      res,
      error,
      "Failed to update schedule request status",
    );
  }
};

const getScheduleRequestStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM schedule_requests
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return successResponse(
      res,
      stats,
      "Schedule request stats retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching schedule request stats");
    return errorResponse(res, error, "Failed to fetch schedule request stats");
  }
};

module.exports = {
  getScheduleRequests,
  createScheduleRequest,
  updateScheduleRequestStatus,
  getScheduleRequestStats,
};
