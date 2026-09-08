const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response");
const { invalidateCache } = require("../middleware/cache");

const VALID_SSKM_TYPES = [
  "organisasi",
  "kemahasiswaan",
  "penelitian",
  "pengabdian",
  "prestasi",
  "keahlian",
  "lecture",
  "lab",
  "seminar",
  "workshop",
  "assignment",
  "exam",
];

const getActivityPoints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      student_id,
      activity_type,
      date_from,
      date_to,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT ap.*, u.name as student_name, u.username, u.jurusan, u.fakultas,
             TO_CHAR(ap.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as createdAt
      FROM activity_points ap
      JOIN users u ON ap.student_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND ap.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }

    if (activity_type) {
      query += ` AND ap.activity_type = $${paramIndex}`;
      params.push(activity_type);
      paramIndex++;
    }

    if (date_from) {
      query += ` AND ap.created_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND ap.created_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    query += ` ORDER BY ap.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    let countQuery =
      "SELECT COUNT(*) as total FROM activity_points ap WHERE 1=1";
    let countParams = [];
    let countIndex = 1;

    if (student_id) {
      countQuery += ` AND ap.student_id = $${countIndex}`;
      countParams.push(student_id);
      countIndex++;
    }

    if (activity_type) {
      countQuery += ` AND ap.activity_type = $${countIndex}`;
      countParams.push(activity_type);
      countIndex++;
    }

    if (date_from) {
      countQuery += ` AND ap.created_at >= $${countIndex}`;
      countParams.push(date_from);
      countIndex++;
    }

    if (date_to) {
      countQuery += ` AND ap.created_at <= $${countIndex}`;
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
      "Activity points retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching activity points");
    return errorResponse(res, error, "Failed to fetch activity points");
  }
};

const addActivityPoint = async (req, res) => {
  try {
    log("Processing activity point creation");
    const { student_id, activity_type, activity_name, points, description } =
      req.body;

    if (!student_id || !activity_type || !points) {
      log(`Activity point creation failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Student ID, activity type, and points are required",
      );
    }

    if (!VALID_SSKM_TYPES.includes(activity_type)) {
      log(
        `Activity point creation failed - Invalid activity type: ${activity_type}`,
      );
      return validationErrorResponse(res, null, "Invalid activity type");
    }

    log(
      `Creating activity point - Student ID: ${student_id}, Type: ${activity_type}, Points: ${points}`,
    );

    const query = `
      INSERT INTO activity_points (student_id, activity_type, activity_name, points, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [
      student_id,
      activity_type,
      activity_name || null,
      parseInt(points),
      description || null,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);
    log(`Activity point created successfully - ID: ${result.rows[0].id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/activity-points*");
    await invalidateCache("cache:/api/activity-points/stats*");
    await invalidateCache("cache:/api/sskm/stats*"); // Invalidate SSKM stats cache
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    if (student_id) {
      await invalidateCache(
        `cache:/api/activity-points/student/${student_id}*`,
      );
    }

    return successResponse(
      res,
      result.rows[0],
      "Activity point added successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error adding activity point");
    return errorResponse(res, error, "Failed to add activity point");
  }
};

const updateActivityPoint = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, activity_name, points, description } = req.body;

    if (activity_type && !VALID_SSKM_TYPES.includes(activity_type)) {
      return validationErrorResponse(res, null, "Invalid activity type");
    }

    const query = `
      UPDATE activity_points 
      SET activity_type = COALESCE($2, activity_type),
          activity_name = COALESCE($3, activity_name),
          points = COALESCE($4, points),
          description = COALESCE($5, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      id,
      activity_type,
      activity_name,
      points ? parseInt(points) : undefined,
      description,
    ];

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Activity point not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/activity-points*");
    await invalidateCache("cache:/api/activity-points/stats*");
    await invalidateCache("cache:/api/sskm/stats*"); // Invalidate SSKM stats cache
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    if (result.rows[0].student_id) {
      await invalidateCache(
        `cache:/api/activity-points/student/${result.rows[0].student_id}*`,
      );
    }

    return successResponse(
      res,
      result.rows[0],
      "Activity point updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating activity point");
    return errorResponse(res, error, "Failed to update activity point");
  }
};

const deleteActivityPoint = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM activity_points WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Activity point not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/activity-points*");
    await invalidateCache("cache:/api/activity-points/stats*");
    await invalidateCache("cache:/api/sskm/stats*"); // Invalidate SSKM stats cache
    await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    if (result.rows[0].student_id) {
      await invalidateCache(
        `cache:/api/activity-points/student/${result.rows[0].student_id}*`,
      );
    }

    return successResponse(
      res,
      result.rows[0],
      "Activity point deleted successfully",
    );
  } catch (error) {
    logError(error, "Error deleting activity point");
    return errorResponse(res, error, "Failed to delete activity point");
  }
};

const getSSKMStats = async (req, res) => {
  try {
    log("Processing SSKM statistics request");

    const queries = await Promise.all([
      pool.query(`
        SELECT activity_type, COUNT(*) as count, SUM(points) as total_points
        FROM activity_points 
        GROUP BY activity_type 
        ORDER BY total_points DESC
      `),
      pool.query(`
        SELECT COUNT(*) as total_students, AVG(points) as avg_points
        FROM (
          SELECT student_id, SUM(points) as points
          FROM activity_points 
          GROUP BY student_id
        ) student_totals
      `),
      pool.query(`
        SELECT u.name, u.username, u.jurusan, SUM(ap.points) as total_points
        FROM activity_points ap
        JOIN users u ON ap.student_id = u.id
        GROUP BY u.id, u.name, u.username, u.jurusan
        ORDER BY total_points DESC
        LIMIT 10
      `),
    ]);

    const stats = {
      by_activity_type: queries[0].rows,
      summary: {
        total_students: parseInt(queries[1].rows[0]?.total_students) || 0,
        average_points: Math.round(
          parseFloat(queries[1].rows[0]?.avg_points) || 0,
        ),
      },
      top_students: queries[2].rows,
    };

    return successResponse(
      res,
      stats,
      "SSKM statistics retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching SSKM statistics");
    return errorResponse(res, error, "Failed to fetch SSKM statistics");
  }
};

const getStudentActivityPoints = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT ap.*, TO_CHAR(ap.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as createdAt
      FROM activity_points ap
      WHERE ap.student_id = $1
      ORDER BY ap.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [
      student_id,
      parseInt(limit),
      offset,
    ]);

    const totalPointsQuery =
      "SELECT COALESCE(SUM(points), 0) as total FROM activity_points WHERE student_id = $1";
    const totalPointsResult = await pool.query(totalPointsQuery, [student_id]);

    return successResponse(
      res,
      {
        activity_points: result.rows,
        total_points: parseInt(totalPointsResult.rows[0].total),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rowCount,
        },
      },
      "Student activity points retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching student activity points");
    return errorResponse(res, error, "Failed to fetch student activity points");
  }
};

module.exports = {
  getActivityPoints,
  addActivityPoint,
  updateActivityPoint,
  deleteActivityPoint,
  getSSKMStats,
  getStudentActivityPoints,
};
