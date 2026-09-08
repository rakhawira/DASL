const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");

const getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", status = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if courses table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'courses'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Return empty result if table doesn't exist
      return paginatedResponse(
        res,
        [],
        {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
        "Courses table not found - returning empty result",
      );
    }

    // Simplified query without instructor dependency
    let query = `
      SELECT c.*
      FROM courses c
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (c.course_name ILIKE $${paramIndex} OR c.course_code ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    if (status) {
      query += ` AND c.is_active = $${paramIndex}`;
      params.push(status === "active");
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (c.course_name ILIKE $${countParamIndex} OR c.course_code ILIKE $${countParamIndex + 1})`;
      countParams.push(`%${search}%`, `%${search}%`);
      countParamIndex += 2;
    }

    if (status) {
      countQuery += ` AND c.is_active = $${countParamIndex}`;
      countParams.push(status === "active");
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
      "Courses retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching courses");
    return errorResponse(res, error, "Failed to fetch courses");
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Fetching course by ID: ${id}`);

    // Check if courses table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'courses'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return errorResponse(res, null, "Courses table not found", 404);
    }

    const query = `
      SELECT * FROM courses WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return errorResponse(res, null, "Course not found", 404);
    }

    return successResponse(res, result.rows[0], "Course retrieved successfully");
  } catch (error) {
    logError(error, "Error fetching course by ID");
    return errorResponse(res, error, "Failed to fetch course");
  }
};

const createCourse = async (req, res) => {
  try {
    log("Processing course creation");
    const {
      kode_matkul,
      nama_matkul,
      sks,
      semester,
      jurusan,
      fakultas,
      dosen_pengajar,
      hari,
      room,
      start_time,
      end_time,
      is_active = true,
    } = req.body;

    if (!kode_matkul || !nama_matkul) {
      log(
        `Course creation failed - Missing required fields: code=${kode_matkul}, name=${nama_matkul}`,
      );
      return validationErrorResponse(
        res,
        null,
        "Course code (kode_matkul) and course name (nama_matkul) are required",
      );
    }

    log(
      `Creating course - Code: ${kode_matkul}, Name: ${nama_matkul}, SKS: ${sks}`,
    );

    const query = `
      INSERT INTO courses (kode_matkul, nama_matkul, sks, semester, jurusan, fakultas, dosen_pengajar, hari, room, start_time, end_time, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      kode_matkul,
      nama_matkul,
      sks ? parseInt(sks) : null,
      semester || null,
      jurusan || null,
      fakultas || null,
      dosen_pengajar || null,
      hari || null,
      room || null,
      start_time || null,
      end_time || null,
      is_active,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);
    log(`Course created successfully - ID: ${result.rows[0].id}`);

    return successResponse(
      res,
      result.rows[0],
      "Course created successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error creating course");
    return errorResponse(res, error, "Failed to create course");
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kode_matkul,
      nama_matkul,
      sks,
      semester,
      jurusan,
      fakultas,
      dosen_pengajar,
      hari,
      room,
      start_time,
      end_time,
      is_active,
    } = req.body;

    const query = `
      UPDATE courses 
      SET kode_matkul = COALESCE($2, kode_matkul),
          nama_matkul = COALESCE($3, nama_matkul),
          sks = COALESCE($4, sks),
          semester = COALESCE($5, semester),
          jurusan = COALESCE($6, jurusan),
          fakultas = COALESCE($7, fakultas),
          dosen_pengajar = COALESCE($8, dosen_pengajar),
          hari = COALESCE($9, hari),
          room = COALESCE($10, room),
          start_time = COALESCE($11, start_time),
          end_time = COALESCE($12, end_time),
          is_active = COALESCE($13, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      id,
      kode_matkul,
      nama_matkul,
      sks ? parseInt(sks) : undefined,
      semester,
      jurusan,
      fakultas,
      dosen_pengajar,
      hari,
      room,
      start_time,
      end_time,
      is_active,
    ];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Course not found");
    }

    return successResponse(res, result.rows[0], "Course updated successfully");
  } catch (error) {
    logError(error, "Error updating course");
    return errorResponse(res, error, "Failed to update course");
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM courses WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Course not found");
    }

    return successResponse(res, result.rows[0], "Course deleted successfully");
  } catch (error) {
    logError(error, "Error deleting course");
    return errorResponse(res, error, "Failed to delete course");
  }
};

const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE courses 
      SET is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Course not found");
    }

    return successResponse(
      res,
      result.rows[0],
      "Course status toggled successfully",
    );
  } catch (error) {
    logError(error, "Error toggling course status");
    return errorResponse(res, error, "Failed to toggle course status");
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
};
