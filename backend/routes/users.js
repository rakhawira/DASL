const express = require("express");
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} = require("../controllers/userController");
const { cacheMiddleware } = require("../middleware/cache");
const { apiRateLimiter } = require("../middleware/rateLimiter");

router.get("/", cacheMiddleware(900), getUsers); // 15 min cache
router.get("/:id", cacheMiddleware(900), getUserById); // 15 min cache
router.post("/", apiRateLimiter, createUser);
router.put("/:id", apiRateLimiter, updateUser);
router.delete("/:id", apiRateLimiter, deleteUser);

module.exports = router;
