const pool = require("../config/database");
const { log, logDatabase, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");
const { validateNumericId } = require("../utils/validation");
const { invalidateCache, invalidateCacheKey } = require("../middleware/cache");
const { newsEvents } = require("../services/redisPubSub");

const getNewsList = async (req, res) => {
  try {
    log("Processing news list request");
    const {
      page = 1,
      limit = 10,
      category = "",
      search = "",
      is_active = true,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    log(
      `Fetching news - Page: ${page}, Limit: ${limit}, Category: ${category}, Search: ${search}`,
    );

    let query = `
      SELECT n.*, u.name as author_name, u.username as author_username
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.is_active = $1
    `;

    const params = [is_active];
    let paramIndex = 2;

    if (category) {
      query += ` AND n.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    query += ` ORDER BY n.publish_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);
    log(`Successfully fetched ${result.rowCount} news items`);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rowCount,
    };

    return paginatedResponse(
      res,
      result.rows,
      pagination,
      "News retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching news");
    return errorResponse(res, error, "Failed to fetch news");
  }
};

const getAdminNewsList = async (req, res) => {
  try {
    const { page = 1, limit = 50, category = "", search = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT n.*, u.name as author_name, u.username as author_username
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND n.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    query += ` ORDER BY n.publish_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count separately
    const countQuery = `
      SELECT COUNT(*) as total
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE 1=1
    `;

    const countParams = [];
    let countParamIndex = 1;

    if (category) {
      countQuery += ` AND n.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (n.title ILIKE $${countParamIndex} OR n.content ILIKE $${countParamIndex + 1})`;
      countParams.push(`%${search}%`, `%${search}%`);
      countParamIndex += 2;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total,
    };

    return paginatedResponse(
      res,
      result.rows,
      pagination,
      "Admin news retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching admin news");
    return errorResponse(res, error, "Failed to fetch admin news");
  }
};

const getNewsStats = async (req, res) => {
  try {
    log("Processing news stats request");
    const queries = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM news WHERE is_active = true"),
      pool.query(
        "SELECT COUNT(*) as this_month FROM news WHERE is_active = true AND publish_date >= DATE_TRUNC('month', CURRENT_DATE)",
      ),
      pool.query(
        "SELECT category, COUNT(*) as count FROM news WHERE is_active = true GROUP BY category ORDER BY count DESC LIMIT 5",
      ),
      pool.query(
        "SELECT AVG(view_count) as avg_views FROM news WHERE is_active = true",
      ),
    ]);

    const stats = {
      total_news: parseInt(queries[0].rows[0].total),
      this_month: parseInt(queries[1].rows[0].this_month),
      top_categories: queries[2].rows,
      average_views: Math.round(parseFloat(queries[3].rows[0].avg_views) || 0),
    };

    return successResponse(
      res,
      stats,
      "News statistics retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching news stats");
    return errorResponse(res, error, "Failed to fetch news statistics");
  }
};

const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    log(`Processing news detail request for ID: ${id}`);

    if (!validateNumericId(id)) {
      log(`Invalid news ID format: ${id}`);
      return validationErrorResponse(res, null, "Invalid news ID format");
    }

    const query = `
      SELECT n.*, u.name as author_name, u.username as author_username
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.id = $1 AND n.is_active = true
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "News not found");
    }

    await pool.query(
      "UPDATE news SET view_count = view_count + 1 WHERE id = $1",
      [id],
    );

    return successResponse(res, result.rows[0], "News retrieved successfully");
  } catch (error) {
    logError(error, "Error fetching news");
    return errorResponse(res, error, "Failed to fetch news");
  }
};

const createNews = async (req, res) => {
  try {
    log("Processing news creation");
    const {
      title,
      content,
      category = "announcement",
      author,
      event_date,
      event_start_time,
      event_end_time,
      is_active = true,
    } = req.body;

    log(`Received news data: ${JSON.stringify(req.body)}`);

    if (!title || !content || !author) {
      log(`News creation failed - Missing required fields`);
      return validationErrorResponse(
        res,
        null,
        "Title, content, and author are required",
      );
    }

    log(
      `Creating news - Title: ${title}, Category: ${category}, Author: ${author}`,
    );

    const query = `
      INSERT INTO news (title, content, category, author, event_date, event_start_time, event_end_time, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      title.trim(),
      content.trim(),
      category,
      author.trim(),
      event_date || null,
      event_start_time || null,
      event_end_time || null,
      is_active,
    ];

    logDatabase("INSERT", query, values);
    const result = await pool.query(query, values);
    log(`News created successfully - ID: ${result.rows[0].id}`);

    // Invalidate cache (with error handling)
    try {
      await invalidateCache("cache:/api/news*");
      await invalidateCache("cache:/api/admin/news*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
    } catch (cacheError) {
      logError(
        cacheError,
        "Cache invalidation failed, but continuing with creation",
      );
    }

    // Publish event (with error handling)
    try {
      await newsEvents.publishNewsCreated(result.rows[0]);
    } catch (pubsubError) {
      logError(
        pubsubError,
        "Event publishing failed, but continuing with creation",
      );
    }

    return successResponse(
      res,
      result.rows[0],
      "News created successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error creating news");
    return errorResponse(res, error, "Failed to create news");
  }
};

const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      author,
      event_date,
      event_start_time,
      event_end_time,
      is_active,
    } = req.body;

    log(`Updating news ID: ${id} with data: ${JSON.stringify(req.body)}`);

    const existingNews = await pool.query("SELECT * FROM news WHERE id = $1", [
      id,
    ]);

    if (existingNews.rows.length === 0) {
      return notFoundResponse(res, "News not found");
    }

    const query = `
      UPDATE news
      SET title = COALESCE($2, title),
          content = COALESCE($3, content),
          category = COALESCE($4, category),
          author = COALESCE($5, author),
          event_date = COALESCE($6, event_date),
          event_start_time = COALESCE($7, event_start_time),
          event_end_time = COALESCE($8, event_end_time),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      title?.trim(),
      content?.trim(),
      category,
      author?.trim(),
      event_date,
      event_start_time,
      event_end_time,
      is_active,
    ];

    logDatabase("UPDATE", query, values);
    const result = await pool.query(query, values);

    // Invalidate cache (with error handling)
    try {
      await invalidateCache("cache:/api/news*");
      await invalidateCache("cache:/api/admin/news*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
      await invalidateCacheKey(`cache:/api/news/${id}`);
    } catch (cacheError) {
      logError(
        cacheError,
        "Cache invalidation failed, but continuing with update",
      );
    }

    // Publish event (with error handling)
    try {
      await newsEvents.publishNewsUpdate(result.rows[0]);
    } catch (pubsubError) {
      logError(
        pubsubError,
        "Event publishing failed, but continuing with update",
      );
    }

    return successResponse(res, result.rows[0], "News updated successfully");
  } catch (error) {
    logError(error, "Error updating news");
    return errorResponse(res, error, "Failed to update news");
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNews = await pool.query("SELECT * FROM news WHERE id = $1", [
      id,
    ]);

    if (existingNews.rows.length === 0) {
      return notFoundResponse(res, "News not found");
    }

    await pool.query("DELETE FROM news WHERE id = $1", [id]);

    // Invalidate cache (with error handling)
    try {
      await invalidateCache("cache:/api/news*");
      await invalidateCache("cache:/api/admin/news*");
      await invalidateCache("cache:/api/notifications*"); // Invalidate notifications cache
      await invalidateCacheKey(`cache:/api/news/${id}`);
    } catch (cacheError) {
      logError(
        cacheError,
        "Cache invalidation failed, but continuing with deletion",
      );
    }

    return successResponse(res, null, "News deleted successfully");
  } catch (error) {
    logError(error, "Error deleting news");
    return errorResponse(res, error, "Failed to delete news");
  }
};

const getNewsCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM news 
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `);

    const categories = [
      {
        value: "",
        label: { EN: "All Categories", ID: "Semua Kategori" },
        count: 0,
      },
      ...result.rows.map((row) => ({
        value: row.category,
        label: {
          EN: row.category.charAt(0).toUpperCase() + row.category.slice(1),
          ID: row.category.charAt(0).toUpperCase() + row.category.slice(1),
        },
        count: parseInt(row.count),
      })),
    ];

    const totalResult = await pool.query(
      "SELECT COUNT(*) as total FROM news WHERE is_active = true",
    );
    categories[0].count = parseInt(totalResult.rows[0].total);

    return successResponse(
      res,
      categories,
      "Categories retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching categories");
    return errorResponse(res, error, "Failed to fetch categories");
  }
};

module.exports = {
  getNewsList,
  getAdminNewsList,
  getNewsStats,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  getNewsCategories,
};
