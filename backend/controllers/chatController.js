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
const { invalidateCache } = require("../middleware/cache");
const {
  encrypt,
  decrypt,
  decryptArray,
  decryptFields,
} = require("../utils/encryption");
const {
  NumericIdSchema,
  CreateConversationSchema,
  SendMessageSchema,
  MarkAsReadSchema,
  DeleteMessageSchema,
  EditMessageSchema,
  AddParticipantSchema,
} = require("../schemas/validationSchemas");

// Get WebSocket server instance for realtime broadcasting
let websocketServer = null;
const getWebSocketServer = () => {
  if (!websocketServer) {
    try {
      const wsModule = require("../services/websocketService");
      websocketServer = wsModule.websocketServer;
    } catch (error) {
      logError(error, "Failed to load WebSocket server");
    }
  }
  return websocketServer;
};

// Get all conversations for a user
const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(userId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid user ID format",
      );
    }

    log(`Fetching conversations for user: ${userId}`);

    const query = `
      SELECT 
        c.id,
        c.title,
        c.type,
        c.created_by,
        c.is_active,
        c.created_at,
        c.updated_at,
        u.name as creator_name,
        u.username as creator_username,
        (
          SELECT u2.name
          FROM chat_participants cp2
          JOIN users u2 ON cp2.user_id = u2.id
          WHERE cp2.conversation_id = c.id
          AND cp2.user_id != $1
          AND c.type = 'direct'
          LIMIT 1
        ) as other_participant_name,
        (
          SELECT COUNT(*) 
          FROM chat_participants 
          WHERE conversation_id = c.id
        ) as participant_count,
        (
          SELECT message 
          FROM chat_messages 
          WHERE conversation_id = c.id AND is_deleted = false
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM chat_messages 
          WHERE conversation_id = c.id AND is_deleted = false
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_at,
        (
          SELECT u.name
          FROM chat_messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = c.id AND m.is_deleted = false
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_sender_name,
        (
          SELECT COUNT(*) 
          FROM chat_messages 
          WHERE conversation_id = c.id 
          AND is_deleted = false
          AND created_at > COALESCE(
            (SELECT last_read_at FROM chat_participants WHERE conversation_id = c.id AND user_id = $1),
            '1970-01-01'::timestamp
          )
        ) as unread_count
      FROM chat_conversations c
      JOIN chat_participants cp ON c.id = cp.conversation_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE cp.user_id = $1 AND c.is_active = true
      ORDER BY c.updated_at DESC
    `;

    logDatabase("SELECT", query, [userId]);
    const result = await pool.query(query, [userId]);

    // Decrypt last_message in conversations
    const decryptedConversations = result.rows.map((conv) => {
      if (conv.last_message) {
        conv.last_message = decrypt(conv.last_message);
      }
      return conv;
    });

    return successResponse(
      res,
      decryptedConversations,
      "Conversations retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching conversations");
    return errorResponse(res, error, "Failed to fetch conversations");
  }
};

// Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid conversation ID format",
      );
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    log(`Fetching messages for conversation: ${conversationId}`);

    const query = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message,
        m.message_type,
        m.file_url,
        m.is_edited,
        m.edited_at,
        m.is_deleted,
        m.is_recalled,
        m.recalled_at,
        m.created_at,
        u.name as sender_name,
        u.username as sender_username,
        u.role as sender_role
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    logDatabase("SELECT", query, [conversationId, parseInt(limit), offset]);
    const result = await pool.query(query, [
      conversationId,
      parseInt(limit),
      offset,
    ]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM chat_messages 
      WHERE conversation_id = $1 AND is_deleted = false
    `;
    const countResult = await pool.query(countQuery, [conversationId]);
    const total = parseInt(countResult.rows[0].total);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    };

    // Decrypt messages before sending to client
    const decryptedMessages = result.rows.map((msg) => {
      if (msg.message) {
        msg.message = decrypt(msg.message);
      }
      return msg;
    });

    return paginatedResponse(
      res,
      decryptedMessages.reverse(), // Reverse to show oldest first
      pagination,
      "Messages retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching messages");
    return errorResponse(res, error, "Failed to fetch messages");
  }
};

// Create a new conversation
const createConversation = async (req, res) => {
  try {
    // Validate request body using zod
    const validationResult = CreateConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Conversation creation failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const {
      title,
      type = "direct",
      created_by,
      participant_ids = [],
    } = validationResult.data;

    log(
      `Creating conversation - Title: ${title}, Type: ${type}, Created by: ${created_by}`,
    );

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create conversation
      const conversationQuery = `
        INSERT INTO chat_conversations (title, type, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const conversationResult = await client.query(conversationQuery, [
        title,
        type,
        created_by,
      ]);
      const conversation = conversationResult.rows[0];

      // Add creator as participant
      await client.query(
        `INSERT INTO chat_participants (conversation_id, user_id, is_admin) VALUES ($1, $2, true)`,
        [conversation.id, created_by],
      );

      // Add other participants
      for (const participantId of participant_ids) {
        if (participantId !== created_by) {
          await client.query(
            `INSERT INTO chat_participants (conversation_id, user_id, is_admin) VALUES ($1, $2, false)
             ON CONFLICT (conversation_id, user_id) DO NOTHING`,
            [conversation.id, participantId],
          );
        }
      }

      await client.query("COMMIT");

      // Fetch full conversation data
      const fullConversationQuery = `
        SELECT 
          c.*,
          u.name as creator_name,
          u.username as creator_username
        FROM chat_conversations c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = $1
      `;
      const fullResult = await pool.query(fullConversationQuery, [
        conversation.id,
      ]);

      // Invalidate cache
      await invalidateCache("cache:/api/chat/*");

      return successResponse(
        res,
        fullResult.rows[0],
        "Conversation created successfully",
        201,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logError(error, "Error creating conversation");
    return errorResponse(res, error, "Failed to create conversation");
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    // Validate request body using zod
    const validationResult = SendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Message send failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const {
      conversation_id,
      sender_id,
      message,
      message_type = "text",
      file_url,
    } = validationResult.data;

    log(
      `Sending message - Conversation: ${conversation_id}, Sender: ${sender_id}`,
    );

    // Check if user is a participant
    const participantCheck = await pool.query(
      `SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversation_id, sender_id],
    );

    if (participantCheck.rows.length === 0) {
      return validationErrorResponse(
        res,
        null,
        "User is not a participant in this conversation",
      );
    }

    // Encrypt message before storing
    const encryptedMessage = encrypt(message);

    // Insert message
    const messageQuery = `
      INSERT INTO chat_messages (conversation_id, sender_id, message, message_type, file_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const messageResult = await pool.query(messageQuery, [
      conversation_id,
      sender_id,
      encryptedMessage,
      message_type,
      file_url,
    ]);

    // Update conversation updated_at
    await pool.query(
      `UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversation_id],
    );

    // Update sender's last_read_at
    await pool.query(
      `UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2`,
      [conversation_id, sender_id],
    );

    // Fetch full message data
    const fullMessageQuery = `
      SELECT 
        m.*,
        u.name as sender_name,
        u.username as sender_username,
        u.role as sender_role
      FROM chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `;
    const fullResult = await pool.query(fullMessageQuery, [
      messageResult.rows[0].id,
    ]);

    // Decrypt message before sending to client
    const decryptedMessage = decryptFields(fullResult.rows[0], ["message"]);

    // Prepare message data for broadcasting
    const messageData = {
      id: decryptedMessage.id,
      conversation_id: decryptedMessage.conversation_id,
      sender_id: decryptedMessage.sender_id,
      sender_name: decryptedMessage.sender_name,
      message: decryptedMessage.message,
      created_at: decryptedMessage.created_at,
      is_edited: decryptedMessage.is_edited,
      is_recalled: decryptedMessage.is_recalled,
      is_deleted: decryptedMessage.is_deleted,
    };

    // Publish to Redis for real-time delivery to other participants
    const { chatEvents } = require("../services/redisPubSub");
    await chatEvents.publishNewMessage(messageData);

    // Direct WebSocket broadcast for immediate realtime delivery
    const ws = getWebSocketServer();
    const roomName = `chat_${conversation_id}`;
    if (ws && ws.io) {
      const messagePayload = {
        type: "new_message",
        data: messageData,
        timestamp: new Date().toISOString(),
      };
      ws.io.to(roomName).emit("message", messagePayload);
      log(`Broadcasted new message to room ${roomName} via WebSocket`);
      log(`Message payload:`, JSON.stringify(messagePayload, null, 2));
      log(
        `Room ${roomName} clients:`,
        ws.io.sockets.adapter.rooms.get(roomName)?.size || 0,
      );
    } else {
      log(
        `WebSocket server not available for broadcasting to room ${roomName}`,
      );
    }

    // Emit conversation update event for realtime chat list updates
    const conversationUpdateData = {
      id: conversation_id,
      last_message: decryptedMessage.message,
      last_message_at: decryptedMessage.created_at,
      last_message_sender_name: decryptedMessage.sender_name,
    };

    if (ws && ws.io) {
      ws.io.emit("message", {
        type: "conversation_updated",
        data: conversationUpdateData,
        timestamp: new Date().toISOString(),
      });
      log(`Broadcasted conversation update via WebSocket`);
    }

    // Publish conversation update to Redis for cross-instance communication
    await chatEvents.publishNewMessage({
      type: "conversation_updated",
      ...conversationUpdateData,
    });

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(
      res,
      decryptedMessage,
      "Message sent successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error sending message");
    return errorResponse(res, error, "Failed to send message");
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    // Validate request body using zod
    const validationResult = MarkAsReadSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Mark as read failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { conversation_id, user_id } = validationResult.data;

    log(
      `Marking messages as read - Conversation: ${conversation_id}, User: ${user_id}`,
    );

    const query = `
      UPDATE chat_participants 
      SET last_read_at = CURRENT_TIMESTAMP 
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [conversation_id, user_id]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Participant not found in conversation");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(res, null, "Messages marked as read");
  } catch (error) {
    logError(error, "Error marking messages as read");
    return errorResponse(res, error, "Failed to mark messages as read");
  }
};

// Delete a message (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(messageId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid message ID format",
      );
    }

    // Validate request body using zod
    const validationResult = DeleteMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Delete message failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { user_id } = validationResult.data;

    log(`Deleting message: ${messageId}`);

    // Check if user is the sender
    const messageCheck = await pool.query(
      `SELECT sender_id FROM chat_messages WHERE id = $1`,
      [messageId],
    );

    if (messageCheck.rows.length === 0) {
      return notFoundResponse(res, "Message not found");
    }

    if (messageCheck.rows[0].sender_id !== parseInt(user_id)) {
      return validationErrorResponse(res, null, "Can only delete own messages");
    }

    const query = `
      UPDATE chat_messages 
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [messageId]);

    // Direct WebSocket broadcast for immediate realtime delivery
    const ws = getWebSocketServer();
    if (ws && ws.io) {
      const conversation_id = result.rows[0].conversation_id;
      const user_id = result.rows[0].sender_id;
      const roomName = `chat_${conversation_id}`;

      ws.io.to(roomName).emit("message", {
        type: "message_deleted",
        data: {
          id: result.rows[0].id,
          conversation_id: conversation_id,
          user_id: user_id,
          is_deleted: true,
          deleted_at: result.rows[0].deleted_at,
        },
        timestamp: new Date().toISOString(),
      });
      log(`Broadcasted message deletion to room ${roomName} via WebSocket`);
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(res, result.rows[0], "Message deleted successfully");
  } catch (error) {
    logError(error, "Error deleting message");
    return errorResponse(res, error, "Failed to delete message");
  }
};

// Edit a message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(messageId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid message ID format",
      );
    }

    // Validate request body using zod
    const validationResult = EditMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Edit message failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { user_id, message } = validationResult.data;

    log(`Editing message: ${messageId}`);

    // Check if user is the sender
    const messageCheck = await pool.query(
      `SELECT sender_id, is_recalled, created_at FROM chat_messages WHERE id = $1`,
      [messageId],
    );

    if (messageCheck.rows.length === 0) {
      return notFoundResponse(res, "Message not found");
    }

    if (messageCheck.rows[0].sender_id !== parseInt(user_id)) {
      return validationErrorResponse(res, null, "Can only edit own messages");
    }

    if (messageCheck.rows[0].is_recalled) {
      return validationErrorResponse(
        res,
        null,
        "Cannot edit recalled messages",
      );
    }

    // Check if message is within edit time limit (15 minutes)
    const messageTime = new Date(messageCheck.rows[0].created_at);
    const currentTime = new Date();
    const minutesDiff = (currentTime - messageTime) / (1000 * 60);

    if (minutesDiff > 15) {
      return validationErrorResponse(
        res,
        null,
        "Cannot edit messages older than 15 minutes",
      );
    }

    // Encrypt message before updating
    const encryptedMessage = encrypt(message.trim());

    const query = `
      UPDATE chat_messages 
      SET message = $1, is_edited = true, edited_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING *,
        (SELECT name FROM users WHERE id = chat_messages.sender_id) as sender_name,
        (SELECT username FROM users WHERE id = chat_messages.sender_id) as sender_username,
        (SELECT role FROM users WHERE id = chat_messages.sender_id) as sender_role
    `;
    const result = await pool.query(query, [encryptedMessage, messageId]);

    // Decrypt message before sending to client
    const decryptedMessage = decryptFields(result.rows[0], ["message"]);

    // Direct WebSocket broadcast for immediate realtime delivery
    const ws = getWebSocketServer();
    if (ws && ws.io) {
      // Get conversation_id from the message
      const conversation_id = decryptedMessage.conversation_id;
      const roomName = `chat_${conversation_id}`;

      ws.io.to(roomName).emit("message", {
        type: "message_edited",
        data: {
          id: decryptedMessage.id,
          conversation_id: conversation_id,
          message: decryptedMessage.message,
          is_edited: true,
          edited_at: decryptedMessage.edited_at,
        },
        timestamp: new Date().toISOString(),
      });
      log(`Broadcasted message edit to room ${roomName} via WebSocket`);
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(
      res,
      decryptedMessage,
      "Message edited successfully",
    );
  } catch (error) {
    logError(error, "Error editing message");
    return errorResponse(res, error, "Failed to edit message");
  }
};

// Recall a message
const recallMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(messageId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid message ID format",
      );
    }

    // Validate request body using zod
    const validationResult = DeleteMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Recall message failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { user_id } = validationResult.data;

    log(`Recalling message: ${messageId}`);

    // Check if user is the sender
    const messageCheck = await pool.query(
      `SELECT sender_id, created_at FROM chat_messages WHERE id = $1`,
      [messageId],
    );

    if (messageCheck.rows.length === 0) {
      return notFoundResponse(res, "Message not found");
    }

    if (messageCheck.rows[0].sender_id !== parseInt(user_id)) {
      return validationErrorResponse(res, null, "Can only recall own messages");
    }

    const query = `
      UPDATE chat_messages 
      SET is_recalled = true, recalled_at = CURRENT_TIMESTAMP 
      WHERE id = $1
      RETURNING *,
        (SELECT name FROM users WHERE id = chat_messages.sender_id) as sender_name,
        (SELECT username FROM users WHERE id = chat_messages.sender_id) as sender_username,
        (SELECT role FROM users WHERE id = chat_messages.sender_id) as sender_role
    `;
    const result = await pool.query(query, [messageId]);

    // Direct WebSocket broadcast for immediate realtime delivery
    const ws = getWebSocketServer();
    if (ws && ws.io) {
      const conversation_id = result.rows[0].conversation_id;
      const roomName = `chat_${conversation_id}`;

      ws.io.to(roomName).emit("message", {
        type: "message_recalled",
        data: {
          id: result.rows[0].id,
          conversation_id: conversation_id,
          is_recalled: true,
          recalled_at: result.rows[0].recalled_at,
        },
        timestamp: new Date().toISOString(),
      });
      log(`Broadcasted message recall to room ${roomName} via WebSocket`);
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(
      res,
      result.rows[0],
      "Message recalled successfully",
    );
  } catch (error) {
    logError(error, "Error recalling message");
    return errorResponse(res, error, "Failed to recall message");
  }
};

// Get available users for chat (excluding self)
const getAvailableUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, search = "" } = req.query;

    log(`Fetching available users - Excluding: ${userId}, Role: ${role}`);

    let query = `
      SELECT 
        u.id,
        u.username,
        u.name,
        u.role,
        u.jurusan,
        u.fakultas,
        u.avatar
      FROM users u
      WHERE u.id != $1 AND u.status = 'active'
    `;

    const params = [userId];
    let paramIndex = 2;

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.username ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.name ASC`;

    logDatabase("SELECT", query, params);
    const result = await pool.query(query, params);

    return successResponse(
      res,
      result.rows,
      "Available users retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching available users");
    return errorResponse(res, error, "Failed to fetch available users");
  }
};

// Get conversation participants
const getParticipants = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!validateNumericId(conversationId)) {
      return validationErrorResponse(
        res,
        null,
        "Invalid conversation ID format",
      );
    }

    log(`Fetching participants for conversation: ${conversationId}`);

    const query = `
      SELECT 
        cp.id,
        cp.user_id,
        cp.joined_at,
        cp.last_read_at,
        cp.is_admin,
        u.name,
        u.username,
        u.role,
        u.avatar
      FROM chat_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = $1
      ORDER BY cp.joined_at ASC
    `;

    logDatabase("SELECT", query, [conversationId]);
    const result = await pool.query(query, [conversationId]);

    return successResponse(
      res,
      result.rows,
      "Participants retrieved successfully",
    );
  } catch (error) {
    logError(error, "Error fetching participants");
    return errorResponse(res, error, "Failed to fetch participants");
  }
};

// Add participant to conversation
const addParticipant = async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Validate ID using zod
    const idValidation = NumericIdSchema.safeParse(conversationId);
    if (!idValidation.success) {
      return validationErrorResponse(
        res,
        idValidation.error.errors,
        "Invalid conversation ID format",
      );
    }

    // Validate request body using zod
    const validationResult = AddParticipantSchema.safeParse(req.body);
    if (!validationResult.success) {
      log(
        `Add participant failed - Validation error: ${JSON.stringify(validationResult.error.errors)}`,
      );
      return validationErrorResponse(
        res,
        validationResult.error.errors,
        "Invalid request data",
      );
    }

    const { user_id } = validationResult.data;

    log(`Adding participant ${user_id} to conversation ${conversationId}`);

    const query = `
      INSERT INTO chat_participants (conversation_id, user_id, is_admin)
      VALUES ($1, $2, false)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [conversationId, user_id]);

    if (result.rows.length === 0) {
      return successResponse(res, null, "User is already a participant");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(
      res,
      result.rows[0],
      "Participant added successfully",
      201,
    );
  } catch (error) {
    logError(error, "Error adding participant");
    return errorResponse(res, error, "Failed to add participant");
  }
};

// Remove participant from conversation
const removeParticipant = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;

    log(`Removing participant ${userId} from conversation ${conversationId}`);

    // Validate IDs using zod
    const conversationIdValidation = NumericIdSchema.safeParse(conversationId);
    const userIdValidation = NumericIdSchema.safeParse(userId);

    if (!conversationIdValidation.success || !userIdValidation.success) {
      return validationErrorResponse(
        res,
        [
          ...(conversationIdValidation.success
            ? []
            : conversationIdValidation.error.errors),
          ...(userIdValidation.success ? [] : userIdValidation.error.errors),
        ],
        "Invalid ID format",
      );
    }

    const query = `
      DELETE FROM chat_participants 
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [conversationId, userId]);

    if (result.rows.length === 0) {
      return notFoundResponse(res, "Participant not found");
    }

    // Invalidate cache
    await invalidateCache("cache:/api/chat/*");

    return successResponse(res, null, "Participant removed successfully");
  } catch (error) {
    logError(error, "Error removing participant");
    return errorResponse(res, error, "Failed to remove participant");
  }
};

module.exports = {
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
};
