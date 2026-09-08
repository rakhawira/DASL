const pool = require("../config/database");
const { log, logError } = require("../utils/logger");
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
} = require("../utils/response");

// Constants
const USER_ROLES = {
  ADMIN: 'admin',
  DOSEN: 'dosen',
  STUDENT: 'student',
};

const NOTIFICATION_TYPES = {
  ADMIN: 'admin',
  SCHEDULE: 'schedule',
  ATTENDANCE: 'attendance',
  UPDATE: 'update',
  NEWS: 'news',
  POINTS: 'points',
};

const USER_STATUS = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
};

const DEVICE_STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
};

const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
};

const DEFAULT_MAX_POINTS = 100;

// Helper functions
const calculateDaysAgo = (date) => {
  const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  return days === 0 ? "Today" : `${days} days ago`;
};

const createNotification = (id, title, message, time, type, isRead) => ({
  id,
  title,
  message,
  time,
  type,
  isRead,
});

const getLatestNews = async () => {
  const result = await pool.query(
    "SELECT title, publish_date FROM news WHERE is_active = true ORDER BY publish_date DESC LIMIT 1"
  );
  if (result.rows.length > 0) {
    const news = result.rows[0];
    return {
      title: news.title,
      time: calculateDaysAgo(news.publish_date),
    };
  }
  return null;
};

const getCount = async (query, params = []) => {
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count);
};

// Generate dynamic notifications based on real user data
const generateNotifications = async (req, res) => {
  try {
    const { userId, username, role } = req.query;

    if (!userId && !username) {
      return validationErrorResponse(
        res,
        null,
        "userId or username is required"
      );
    }

    log(`Generating notifications for user: ${username || userId}`);
    const notifications = [];
    let notificationId = Date.now();

    // Get user info
    const userQuery = userId 
      ? "SELECT * FROM users WHERE id = $1"
      : "SELECT * FROM users WHERE username = $1";
    const userParams = userId ? [userId] : [username];

    const userResult = await pool.query(userQuery, userParams);
    const user = userResult.rows[0];

    if (!user) {
      return notFoundResponse(res, "User not found");
    }

    const userRole = role || user.role;

    // Generate notifications based on role
    if (userRole === USER_ROLES.ADMIN) {
      // Admin: Pending user registrations
      const pendingCount = await getCount(
        "SELECT COUNT(*) as count FROM users WHERE status = $1",
        [USER_STATUS.INACTIVE]
      );
      if (pendingCount > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Pending User Approvals",
            `${pendingCount} users are awaiting approval.`,
            "Just now",
            NOTIFICATION_TYPES.ADMIN,
            false
          )
        );
      }

      // Admin: Device status
      const offlineCount = await getCount(
        "SELECT COUNT(*) as count FROM devices WHERE status = $1",
        [DEVICE_STATUS.OFFLINE]
      );
      notifications.push(
        createNotification(
          notificationId++,
          "Device Status",
          `${offlineCount} devices are currently offline.`,
          "2 hours ago",
          NOTIFICATION_TYPES.ADMIN,
          true
        )
      );

      // Admin: Schedule requests
      const pendingRequests = await getCount(
        "SELECT COUNT(*) as count FROM schedule_requests WHERE status = $1",
        [REQUEST_STATUS.PENDING]
      );
      if (pendingRequests > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Schedule Update Requests",
            `${pendingRequests} schedule change requests need review.`,
            "1 day ago",
            NOTIFICATION_TYPES.ADMIN,
            false
          )
        );
      }

      // Admin: Attendance stats
      const todayAttendance = await getCount(
        "SELECT COUNT(*) as count FROM attendance_logs WHERE DATE(check_time) = CURRENT_DATE"
      );
      notifications.push(
        createNotification(
          notificationId++,
          "Daily Attendance Report",
          `${todayAttendance} attendance records recorded today.`,
          "3 days ago",
          NOTIFICATION_TYPES.ADMIN,
          true
        )
      );
    } else if (userRole === USER_ROLES.DOSEN) {
      // Lecturer: Upcoming classes
      const courseCount = await getCount(
        "SELECT COUNT(*) as count FROM courses WHERE dosen_pengajar = $1 AND is_active = true",
        [user.name]
      );
      if (courseCount > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Upcoming Classes",
            `You have ${courseCount} active courses this semester.`,
            "Just now",
            NOTIFICATION_TYPES.SCHEDULE,
            false
          )
        );
      }

      // Lecturer: Students with low attendance
      const lowAttendanceResult = await pool.query(
        `SELECT COUNT(DISTINCT username) as count 
         FROM attendance_logs 
         WHERE status = 'present' 
         AND check_time >= NOW() - INTERVAL '30 days'
         GROUP BY username 
         HAVING COUNT(*) < 10`
      );
      const lowAttendanceCount = lowAttendanceResult.rows.length;
      if (lowAttendanceCount > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Low Attendance Alert",
            `${lowAttendanceCount} students have attendance below 75%. Please review.`,
            "5 hours ago",
            NOTIFICATION_TYPES.ATTENDANCE,
            false
          )
        );
      }

      // Lecturer: Perwalian requests
      const perwalianCount = await getCount(
        "SELECT COUNT(*) as count FROM perwalian_courses WHERE status = $1",
        [REQUEST_STATUS.PENDING]
      );
      if (perwalianCount > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Perwalian Requests",
            `${perwalianCount} course enrollment requests pending approval.`,
            "1 day ago",
            NOTIFICATION_TYPES.UPDATE,
            true
          )
        );
      }

      // Lecturer: Latest news
      const latestNews = await getLatestNews();
      if (latestNews) {
        notifications.push(
          createNotification(
            notificationId++,
            "Latest Campus News",
            latestNews.title,
            latestNews.time,
            NOTIFICATION_TYPES.NEWS,
            true
          )
        );
      }
    } else {
      // Student: Attendance reminders
      const todayAttendanceResult = await pool.query(
        "SELECT * FROM attendance_logs WHERE username = $1 AND DATE(check_time) = CURRENT_DATE",
        [user.username]
      );
      const hasAttendedToday = todayAttendanceResult.rows.length > 0;
      if (!hasAttendedToday) {
        notifications.push(
          createNotification(
            notificationId++,
            "Attendance Reminder",
            "Don't forget to mark your attendance for today's classes.",
            "Just now",
            NOTIFICATION_TYPES.ATTENDANCE,
            false
          )
        );
      }

      // Student: Course schedule
      const enrolledCourses = await getCount(
        "SELECT COUNT(*) as count FROM perwalian_courses WHERE user_id = $1 AND status = $2",
        [user.id, REQUEST_STATUS.APPROVED]
      );
      if (enrolledCourses > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Course Schedule",
            `You are enrolled in ${enrolledCourses} courses this semester.`,
            "2 hours ago",
            NOTIFICATION_TYPES.SCHEDULE,
            false
          )
        );
      }

      // Student: Activity points
      const activityPointsResult = await pool.query(
        "SELECT COALESCE(SUM(points), 0) as total_points FROM activity_points WHERE student_id = $1",
        [user.id]
      );
      const totalPoints = parseInt(activityPointsResult.rows[0].total_points);
      const maxPointsResult = await pool.query(
        "SELECT max_points FROM max_activity_points LIMIT 1"
      );
      const maxPoints = maxPointsResult.rows.length > 0 
        ? parseInt(maxPointsResult.rows[0].max_points) 
        : DEFAULT_MAX_POINTS;
      notifications.push(
        createNotification(
          notificationId++,
          "Activity Points Progress",
          `You have earned ${totalPoints}/${maxPoints} activity points.`,
          "5 hours ago",
          NOTIFICATION_TYPES.POINTS,
          true
        )
      );

      // Student: Latest news
      const latestNews = await getLatestNews();
      if (latestNews) {
        notifications.push(
          createNotification(
            notificationId++,
            "Campus Announcement",
            latestNews.title,
            latestNews.time,
            NOTIFICATION_TYPES.NEWS,
            true
          )
        );
      }

      // Student: Pending perwalian requests
      const pendingPerwalian = await getCount(
        "SELECT COUNT(*) as count FROM perwalian_courses WHERE user_id = $1 AND status = $2",
        [user.id, REQUEST_STATUS.PENDING]
      );
      if (pendingPerwalian > 0) {
        notifications.push(
          createNotification(
            notificationId++,
            "Course Enrollment Status",
            `You have ${pendingPerwalian} pending course enrollment requests.`,
            "3 days ago",
            NOTIFICATION_TYPES.UPDATE,
            true
          )
        );
      }
    }

    log(`Generated ${notifications.length} notifications for user: ${user.username}`);
    return successResponse(res, notifications, "Notifications generated successfully");
  } catch (error) {
    logError(error, "Error generating notifications");
    return errorResponse(res, error, "Failed to generate notifications");
  }
};

module.exports = {
  generateNotifications,
};
