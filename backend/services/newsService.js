const pool = require("../config/database");
const { logDatabase, logError } = require("../utils/logger");

const getNewsList = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = "",
      search = "",
      is_active = true,
    } = filters;

    const offset = (parseInt(page) - 1) * parseInt(limit);

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

    return {
      news: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount,
      },
    };
  } catch (error) {
    logError(error, "Error fetching news list");
    throw error;
  }
};

const getNewsById = async (id, is_active = true) => {
  try {
    const query = `
      SELECT n.*, u.name as author_name, u.username as author_username
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.id = $1 AND n.is_active = $2
    `;

    const result = await pool.query(query, [id, is_active]);

    if (result.rows.length === 0) {
      return null;
    }

    await pool.query(
      "UPDATE news SET view_count = view_count + 1 WHERE id = $1",
      [id],
    );

    return result.rows[0];
  } catch (error) {
    logError(error, "Error fetching news by ID");
    throw error;
  }
};

const createNews = async (newsData) => {
  try {
    const {
      title,
      content,
      category = "announcement",
      author,
      event_date,
      is_active = true,
    } = newsData;

    const query = `
      INSERT INTO news (title, content, category, author, event_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      title.trim(),
      content.trim(),
      category,
      author.trim(),
      event_date || null,
      is_active,
    ];

    logDatabase("INSERT", query, values);
    const result = await pool.query(query, values);

    return result.rows[0];
  } catch (error) {
    logError(error, "Error creating news");
    throw error;
  }
};

const updateNews = async (id, updateData) => {
  try {
    const { title, content, category, author, event_date, is_active } = updateData;

    const query = `
      UPDATE news 
      SET title = COALESCE($2, title),
          content = COALESCE($3, content),
          category = COALESCE($4, category),
          author = COALESCE($5, author),
          event_date = COALESCE($6, event_date),
          is_active = COALESCE($7, is_active),
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
      is_active,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error updating news");
    throw error;
  }
};

const deleteNews = async (id) => {
  try {
    const query = "DELETE FROM news WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, "Error deleting news");
    throw error;
  }
};

const getNewsStats = async () => {
  try {
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

    return {
      total_news: parseInt(queries[0].rows[0].total),
      this_month: parseInt(queries[1].rows[0].this_month),
      top_categories: queries[2].rows,
      average_views: Math.round(parseFloat(queries[3].rows[0].avg_views) || 0),
    };
  } catch (error) {
    logError(error, "Error fetching news stats");
    throw error;
  }
};

const getNewsCategories = async () => {
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

    return categories;
  } catch (error) {
    logError(error, "Error fetching news categories");
    throw error;
  }
};

module.exports = {
  getNewsList,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  getNewsStats,
  getNewsCategories,
};
