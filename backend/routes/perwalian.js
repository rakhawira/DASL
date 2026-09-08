const express = require("express");
const router = express.Router();
const {
  getPerwalianStatus,
  updatePerwalianStatus,
  getPerwalianCourses,
  createPerwalianCourse,
  updatePerwalianCourseStatus,
  deletePerwalianCourse,
} = require("../controllers/perwalianController");
const { cacheMiddleware } = require("../middleware/cache");

// GET /api/perwalian/status - Get perwalian status
router.get("/status", cacheMiddleware(300), getPerwalianStatus);

// PUT /api/perwalian/status - Update perwalian status
router.put("/status", updatePerwalianStatus);

// GET /api/perwalian/courses - Get all perwalian courses
router.get("/courses", cacheMiddleware(300), getPerwalianCourses);

// POST /api/perwalian/courses - Create new perwalian course
router.post("/courses", createPerwalianCourse);

// PUT /api/perwalian/courses/:id/status - Update perwalian course status
router.put("/courses/:id/status", updatePerwalianCourseStatus);

// DELETE /api/perwalian/courses/:id - Delete perwalian course
router.delete("/courses/:id", deletePerwalianCourse);

module.exports = router;
