const pool = require("../config/database");
const { logDatabase, logError } = require("../utils/logger");
const { invalidateCache } = require("../middleware/cache");

const getAttendanceStats = async (filters = {}) => {
  try {
    const { date_from, date_to } = filters;
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

    return {
      ...result.rows[0],
      today_count: todayCount,
    };
  } catch (error) {
    logError(error, "Error fetching attendance stats");
    throw error;
  }
};

module.exports = {
  getAttendanceStats,
};
