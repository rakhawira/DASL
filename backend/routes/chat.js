const express = require("express");
const router = express.Router();
const {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markAsRead,
  deleteMessage,
  editMessage,
  recallMessage,
  getAvailableUsers,
  getParticipants,
  addParticipant,
  removeParticipant,
} = require("../controllers/chatController");
const { cacheMiddleware } = require("../middleware/cache");

// Root endpoint for health check
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Chat API is running",
    endpoints: {
      conversations: "/api/chat/conversations/:userId",
      messages: "/api/chat/messages/:conversationId",
      create_conversation: "/api/chat/conversations",
      send_message: "/api/chat/messages",
      mark_read: "/api/chat/read",
      delete_message: "/api/chat/messages/:messageId",
      edit_message: "/api/chat/messages/:messageId",
      recall_message: "/api/chat/messages/:messageId/recall",
      users: "/api/chat/users/:userId",
      participants: "/api/chat/participants/:conversationId",
      add_participant: "/api/chat/participants/:conversationId",
      remove_participant: "/api/chat/participants/:conversationId/:userId",
    },
  });
});

// Get conversations for a user
router.get("/conversations/:userId", cacheMiddleware(60), getConversations);

// Get messages for a conversation
router.get("/messages/:conversationId", cacheMiddleware(60), getMessages);

// Create new conversation
router.post("/conversations", createConversation);

// Send message
router.post("/messages", sendMessage);

// Mark messages as read
router.post("/read", markAsRead);

// Delete message (soft delete)
router.delete("/messages/:messageId", deleteMessage);

// Edit message
router.put("/messages/:messageId", editMessage);

// Recall message
router.post("/messages/:messageId/recall", recallMessage);

// Get available users for chat
router.get("/users/:userId", cacheMiddleware(300), getAvailableUsers);

// Get conversation participants
router.get(
  "/participants/:conversationId",
  cacheMiddleware(60),
  getParticipants,
);

// Add participant to conversation
router.post("/participants/:conversationId", addParticipant);

// Remove participant from conversation
router.delete("/participants/:conversationId/:userId", removeParticipant);

module.exports = router;
