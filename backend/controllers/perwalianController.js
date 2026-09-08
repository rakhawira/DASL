const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

// Get perwalian status
const getPerwalianStatus = async (req, res) => {
  try {
    // Check if perwalian_requests table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perwalian_requests'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS perwalian_requests (
          id SERIAL PRIMARY KEY,
          status BOOLEAN DEFAULT false,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS perwalian_requests_status_key ON perwalian_requests USING btree (status);
      `);

      // Insert default value
      await pool.query(`
        INSERT INTO perwalian_requests (status) VALUES (false) ON CONFLICT DO NOTHING
      `);
    }

    // Get status
    const query = `
      SELECT * FROM perwalian_requests
      ORDER BY id ASC
      LIMIT 1
    `;

    logDatabase("SELECT", query);
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      // Insert default if no record exists
      const insertQuery = `
        INSERT INTO perwalian_requests (status) 
        VALUES (false) 
        RETURNING *
      `;
      const insertResult = await pool.query(insertQuery);

      return successResponse(
        res,
        {
          status: insertResult.rows[0].status,
          updated_at: insertResult.rows[0].updated_at,
        },
        "Perwalian status retrieved successfully",
      );
    }

    return successResponse(
      res,
      {
        status: result.rows[0].status,
        updated_at: result.rows[0].updated_at,
      },
      "Perwalian status retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching perwalian status");
    return errorResponse(res, error, "Failed to fetch perwalian status");
  }
};

// Update perwalian status
const updatePerwalianStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (typeof status !== "boolean") {
      return validationErrorResponse(
        res,
        null,
        "Status must be a boolean (true/false)",
      );
    }

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perwalian_requests'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS perwalian_requests (
          id SERIAL PRIMARY KEY,
          status BOOLEAN DEFAULT false,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Check if record exists
    const checkQuery = `SELECT id FROM perwalian_requests ORDER BY id ASC LIMIT 1`;
    const checkResult = await pool.query(checkQuery);

    let result;
    if (checkResult.rows.length === 0) {
      // Insert new record
      const insertQuery = `
        INSERT INTO perwalian_requests (status, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [status]);
    } else {
      // Update existing record
      const updateQuery = `
        UPDATE perwalian_requests 
        SET status = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      result = await pool.query(updateQuery, [status, checkResult.rows[0].id]);
    }

    log(`Perwalian status updated to: ${status}`);

    // Invalidate cache
    await invalidateCache("cache:/api/perwalian/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Perwalian status updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating perwalian status");
    return errorResponse(res, error, "Failed to update perwalian status");
  }
};

// Get all perwalian courses with user and course details
const getPerwalianCourses = async (req, res) => {
  try {
    const { user_id, status } = req.query;

    // Check if perwalian_courses table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perwalian_courses'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return successResponse(res, [], "No perwalian courses found");
    }

    // Build query with optional filters
    let query = `
      SELECT 
        pc.id,
        pc.user_id,
        pc.course_id,
        pc.status,
        pc.requested_at,
        pc.approved_at,
        pc.approved_by,
        c.id as course_id,
        c.kode_matkul,
        c.nama_matkul,
        c.sks,
        c.dosen_pengajar,
        c.hari,
        c.room,
        c.start_time,
        c.end_time,
        u.id as user_id,
        u.name,
        u.username,
        u.jurusan,
        approver.name as approver_name
      FROM perwalian_courses pc
      LEFT JOIN courses c ON pc.course_id = c.id
      LEFT JOIN users u ON pc.user_id = u.id
      LEFT JOIN users approver ON pc.approved_by = approver.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (user_id) {
      conditions.push(`pc.user_id = $${paramIndex}`);
      params.push(user_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`pc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY pc.requested_at DESC`;

    const result = await pool.query(query, params);

    // Format the response
    const formattedData = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      course_id: row.course_id,
      status: row.status,
      requested_at: row.requested_at,
      approved_at: row.approved_at,
      approved_by: row.approved_by,
      approver_name: row.approver_name,
      course: row.course_id
        ? {
            id: row.course_id,
            kode_matkul: row.kode_matkul,
            nama_matkul: row.nama_matkul,
            sks: row.sks,
            dosen_pengajar: row.dosen_pengajar,
            hari: row.hari,
            room: row.room,
            start_time: row.start_time,
            end_time: row.end_time,
          }
        : null,
      user: row.user_id
        ? {
            id: row.user_id,
            name: row.name,
            nim: row.username,
            jurusan: row.jurusan,
          }
        : null,
    }));

    return successResponse(
      res,
      formattedData,
      "Perwalian courses retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching perwalian courses");
    return errorResponse(res, error, "Failed to fetch perwalian courses");
  }
};

// Create new perwalian course
const createPerwalianCourse = async (req, res) => {
  try {
    const { user_id, course_id } = req.body;

    if (!user_id || !course_id) {
      return validationErrorResponse(
        res,
        null,
        "user_id and course_id are required",
      );
    }

    // Check if perwalian_courses table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perwalian_courses'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS perwalian_courses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          approved_at TIMESTAMP WITHOUT TIME ZONE,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, course_id)
        )
      `);

      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS perwalian_courses_user_id_key ON perwalian_courses USING btree (user_id);
        CREATE INDEX IF NOT EXISTS perwalian_courses_course_id_key ON perwalian_courses USING btree (course_id);
        CREATE INDEX IF NOT EXISTS perwalian_courses_status_key ON perwalian_courses USING btree (status);
      `);
    }

    // Check for existing pending request
    const existingCheck = await pool.query(
      `SELECT id FROM perwalian_courses 
       WHERE user_id = $1 AND course_id = $2 AND status = 'pending'`,
      [user_id, course_id],
    );

    if (existingCheck.rows.length > 0) {
      return errorResponse(
        res,
        null,
        "You already have a pending request for this course",
        409,
      );
    }

    const insertQuery = `
      INSERT INTO perwalian_courses (user_id, course_id, status, requested_at)
      VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [user_id, course_id]);

    log(`Created perwalian course: user_id=${user_id}, course_id=${course_id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/perwalian/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Perwalian course created successfully",
    );
  } catch (error) {
    logError(error, "Error creating perwalian course");
    return errorResponse(res, error, "Failed to create perwalian course");
  }
};

// Update perwalian course status (approve/reject)
const updatePerwalianCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;

    if (
      !status ||
      !["pending", "approved", "rejected", "completed", "cancelled"].includes(
        status,
      )
    ) {
      return validationErrorResponse(
        res,
        null,
        "Invalid status. Must be one of: pending, approved, rejected, completed, cancelled",
      );
    }

    const approved_at = status === "approved" ? "CURRENT_TIMESTAMP" : null;

    const updateQuery = approved_by
      ? `
        UPDATE perwalian_courses 
        SET status = $1,
            approved_by = $2,
            approved_at = ${approved_at}
        WHERE id = $3
        RETURNING *
      `
      : `
        UPDATE perwalian_courses 
        SET status = $1,
            approved_at = ${approved_at}
        WHERE id = $2
        RETURNING *
      `;

    const params = approved_by ? [status, approved_by, id] : [status, id];
    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return notFoundResponse(res, null, "Perwalian course not found");
    }

    log(`Updated perwalian course ${id} status to: ${status}`);

    // Invalidate cache
    await invalidateCache("cache:/api/perwalian/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Perwalian course status updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating perwalian course status");
    return errorResponse(
      res,
      error,
      "Failed to update perwalian course status",
    );
  }
};

// Delete perwalian course
const deletePerwalianCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = `DELETE FROM perwalian_courses WHERE id = $1 RETURNING *`;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, null, "Perwalian course not found");
    }

    log(`Deleted perwalian course: ${id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/perwalian/*");
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache

    return successResponse(
      res,
      result.rows[0],
      "Perwalian course deleted successfully",
    );
  } catch (error) {
    logError(error, "Error deleting perwalian course");
    return errorResponse(res, error, "Failed to delete perwalian course");
  }
};

module.exports = {
  getPerwalianStatus,
  updatePerwalianStatus,
  getPerwalianCourses,
  createPerwalianCourse,
  updatePerwalianCourseStatus,
  deletePerwalianCourse,
};
