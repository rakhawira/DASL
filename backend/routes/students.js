const express = require("express");
const router = express.Router();
const { getStudentActivityPoints } = require("../controllers/activityController");

// Student activity points route
router.get("/:studentId/activity-points", getStudentActivityPoints);

module.exports = router;
