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

const getApprovals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", type = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if approvals table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'approval_requests'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      // Create approvals table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS approval_requests (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          requested_by VARCHAR(255) NOT NULL,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'pending',
          approved_by VARCHAR(255),
          approved_at TIMESTAMP,
          rejection_reason TEXT,
          request_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for better performance
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
        CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
        CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
      `);
    }

    let query = `
      SELECT *
      FROM approval_requests
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY requested_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM approval_requests
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (type) {
      countQuery += ` AND type = $${countParamIndex}`;
      countParams.push(type);
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
      "Approval requests retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching approval requests");
    return errorResponse(res, error, "Failed to fetch approval requests");
  }
};

const createApprovalRequest = async (req, res) => {
  try {
    log("Processing approval request creation");
    const { type, title, description, requested_by, request_data } = req.body;

    if (!type || !title || !requested_by) {
      log(`Approval request creation failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Type, title, and requested_by are required",
      );
    }

    log(
      `Creating approval request - Type: ${type}, Title: ${title}, Requested by: ${requested_by}`,
    );

    const query = `
      INSERT INTO approval_requests (type, title, description, requested_by, request_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [
      type,
      title,
      description || null,
      requested_by,
      request_data ? JSON.stringify(request_data) : null,
    ];

    logDatabase("INSERT", query, params);
    const result = await pool.query(query, params);
    log(`Approval request created successfully - ID: ${result.rows[0].id}`);

    // Invalidate cache
    await invalidateCache("cache:/api/approvals/*");

    return successResponse(
      res,
      result.rows[0],
      "Approval request created successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error creating approval request");
    return errorResponse(res, error, "Failed to create approval request");
  }
};

const updateApprovalStatus = async (req, res) => {
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

    const query = `
      UPDATE approval_requests 
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

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Approval request not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/approvals/*");

    return successResponse(
      res,
      result.rows[0],
      "Approval status updated successfully",
    );
  } catch (error) {
    logError(error, "Error updating approval status");
    return errorResponse(res, error, "Failed to update approval status");
  }
};

const getApprovalStats = async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM approval_requests
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return successResponse(res, stats, "Approval stats retrieved successfully");
  } catch (error) {
    logError(error, "Error fetching approval stats");
    return errorResponse(res, error, "Failed to fetch approval stats");
  }
};

module.exports = {
  getApprovals,
  createApprovalRequest,
  updateApprovalStatus,
  getApprovalStats,
};
