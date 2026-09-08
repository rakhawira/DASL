const express = require("express");
const router = express.Router();
const {
  getApprovals,
  createApprovalRequest,
  updateApprovalStatus,
  getApprovalStats,
} = require("../controllers/approvalController");
const { cacheMiddleware } = require("../middleware/cache");

// GET /api/approvals - Get all approval requests
router.get("/", cacheMiddleware(300), getApprovals);

// POST /api/approvals - Create new approval request
router.post("/", createApprovalRequest);

// PUT /api/approvals/:id/status - Update approval status
router.put("/:id/status", updateApprovalStatus);

// GET /api/approvals/stats - Get approval statistics
router.get("/stats", cacheMiddleware(300), getApprovalStats);

module.exports = router;
