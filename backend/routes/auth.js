const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  verifySession,
  cleanupSessions,
} = require("../controllers/authController");
const {
  authRateLimiter,
  apiRateLimiter,
} = require("../middleware/rateLimiter");

router.post("/login", authRateLimiter, login);
router.post("/logout", apiRateLimiter, logout);
router.get("/verify", apiRateLimiter, verifySession);
router.post("/cleanup", apiRateLimiter, cleanupSessions);

module.exports = router;
