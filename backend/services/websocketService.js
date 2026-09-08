const { Server } = require("socket.io");
const { log, logError } = require("../utils/logger");
const {
  attendanceEvents,
  nfcEvents,
  qrEvents,
  chatEvents,
  deviceEvents,
  subscribeToChannel,
} = require("./redisPubSub");
const { v4: uuidv4 } = require("uuid");

// Import utilities
const deviceManager = require("../utils/deviceManager");
const sessionManager = require("../utils/sessionManager");
const {
  broadcastToMobileClients,
  sendToClientById,
} = require("../utils/websocketBroadcast");

// Configuration
const NFC_TIMEOUT = 10000; // 10 seconds
const QR_TIMEOUT = 10000; // 10 seconds

class WebSocketServer {
  constructor() {
    this.io = null;
    this.clients = new Map(); // socket.id -> clientData
    this.deviceChannels = new Map(); // deviceId -> Set of socket IDs
    this.devices = deviceManager.devices; // Reference to device manager's devices map
  }

  // Initialize Socket.io server
  initialize(server) {
    try {
      log("Initializing Socket.io server for ESP32 communication");

      this.io = new Server(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"],
      });

      this.io.on("connection", (socket) => {
        const clientType =
          socket.handshake.headers["x-client-type"] || "unknown";
        const isESP32 =
          clientType === "esp32" ||
          socket.handshake.headers["user-agent"]?.includes("ESP32");

        log(`New Socket.io connection: ${socket.id} (${clientType})`);

        // Store client
        this.clients.set(socket.id, {
          socket,
          id: socket.id,
          type: isESP32 ? "esp32" : clientType,
          connectedAt: new Date(),
          lastActivity: new Date(),
        });

        // Register ESP32 device
        if (isESP32) {
          const deviceId = socket.handshake.headers["x-device-id"] || socket.id;
          deviceManager.registerDevice(deviceId, socket, {
            status: "online",
            connectedAt: new Date(),
          });
          log(`ESP32 device connected: ${deviceId}`);
        }

        // Handle messages
        socket.on("message", (data) => {
          try {
            const message = typeof data === "string" ? JSON.parse(data) : data;
            this.handleMessage(socket, message);
          } catch (error) {
            logError(error, "Error parsing Socket.io message");
          }
        });

        socket.on("disconnect", () => {
          this.handleDisconnection(socket);
        });

        socket.on("error", (error) => {
          logError(error, "Socket.io connection error");
        });

        // Handle room join/leave for chat
        socket.on("join_room", (room) => {
          socket.join(room);
          log(`Socket ${socket.id} joined room: ${room}`);
          log(`Rooms for socket ${socket.id}:`, Array.from(socket.rooms));
        });

        socket.on("leave_room", (room) => {
          socket.leave(room);
          log(`Socket ${socket.id} left room: ${room}`);
          log(`Rooms for socket ${socket.id}:`, Array.from(socket.rooms));
        });

        // Send welcome message
        socket.emit("welcome", {
          message: "Connected to DASL Socket.io server",
          clientId: socket.id,
          timestamp: new Date().toISOString(),
        });
      });

      // Subscribe to Redis Pub/Sub channels for cross-instance communication
      this.subscribeToRedisChannels();

      log("Socket.io server initialized successfully");
    } catch (error) {
      logError(error, "Failed to initialize Socket.io server");
    }
  }

  // Subscribe to Redis Pub/Sub channels
  async subscribeToRedisChannels() {
    try {
      log("Starting Redis Pub/Sub subscription...");

      // Subscribe to attendance events
      await subscribeToChannel("attendance:events", (message) => {
        if (message.type === "attendance_result") {
          this.broadcastToChannel(message.deviceId, message);
        }
      });
      log("Subscribed to attendance:events");

      // Subscribe to NFC events
      await subscribeToChannel("nfc:events", (message) => {
        if (message.type === "nfc_reading" || message.type === "nfc_status") {
          this.broadcastToChannel(message.deviceId, message);
        }
      });
      log("Subscribed to nfc:events");

      // Subscribe to QR events
      await subscribeToChannel("qr:events", (message) => {
        if (message.type === "qr_reading" || message.type === "qr_status") {
          this.broadcastToChannel(message.deviceId, message);
        }
      });
      log("Subscribed to qr:events");

      // Subscribe to chat events
      await subscribeToChannel("chat:events", (message) => {
        if (message.type === "new_message") {
          // Message is already decrypted from chatController
          // Wrap in the correct format that frontend expects
          this.broadcastToChannel(`chat_${message.conversation_id}`, {
            type: "new_message",
            data: message,
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === "conversation_updated") {
          // Broadcast conversation update to all clients
          this.broadcastToAll({
            type: "conversation_updated",
            data: message,
            timestamp: new Date().toISOString(),
          });
        }
      });
      log("Subscribed to chat:events");

      // Subscribe to device events
      await subscribeToChannel("device:events", (message) => {
        if (
          message.type === "device_online" ||
          message.type === "device_offline"
        ) {
          this.broadcastToAll(message);
        }
      });
      log("Subscribed to device:events");

      log("Subscribed to Redis Pub/Sub channels");
    } catch (error) {
      logError(error, "Failed to subscribe to Redis Pub/Sub channels");
      // Don't throw error - allow WebSocket server to continue without Redis Pub/Sub
    }
  }

  // Handle incoming messages
  handleMessage(socket, message) {
    const { type, deviceId, data } = message;
    const clientData = this.clients.get(socket.id);

    console.log("[WebSocket] ========================================");
    console.log("[WebSocket] Message Received");
    console.log("[WebSocket] Type:", type);
    console.log("[WebSocket] Data:", JSON.stringify(data, null, 2));
    console.log("[WebSocket] ========================================");

    switch (type) {
      // Device management
      case "device_register":
        this.handleDeviceRegistration(socket, message.data, clientData);
        break;
      case "device_status_update":
        this.handleDeviceStatusUpdate(message.data);
        break;
      case "device_heartbeat":
        this.handleDeviceHeartbeat(deviceId, data);
        break;

      // NFC attendance
      case "nfc_trigger":
        this.handleNFCTrigger(message.data, clientData);
        break;
      case "nfc_ack":
        this.handleNFCAcknowledgment(message.data, clientData);
        break;
      case "nfc_result":
        this.handleNFCResult(deviceId, data);
        break;
      case "nfc_error":
        this.handleNFCError(deviceId, data);
        break;

      // QR attendance
      case "qr_trigger":
        this.handleQRTrigger(message.data, clientData);
        break;
      case "qr_scan":
        this.handleQRScan(message.data, clientData);
        break;
      case "qr_ack":
        this.handleQRAcknowledgment(message.data, clientData);
        break;
      case "qr_result":
        this.handleQRResult(deviceId, data);
        break;

      // Attendance results
      case "attendance_result":
        this.handleAttendanceResult(message.data, clientData);
        break;

      // Chat
      case "join_chat":
        this.handleJoinChat(socket, data);
        break;
      case "leave_chat":
        this.handleLeaveChat(socket, data);
        break;
      case "send_message":
        this.handleSendMessage(socket, data);
        break;
      case "edit_message":
        this.handleEditMessage(socket, data);
        break;
      case "recall_message":
        this.handleRecallMessage(socket, data);
        break;
      case "delete_message":
        this.handleDeleteMessage(socket, data);
        break;

      // Heartbeat
      case "heartbeat":
        this.handleHeartbeat(socket, clientData);
        break;

      default:
        log(`Unknown message type: ${type}`);
    }
  }

  // Handle device registration from ESP32
  async handleDeviceRegistration(socket, data, clientData) {
    log(`Device registration from ${clientData.id}:`, data);

    const {
      device_id: deviceId,
      device_name: deviceName,
      location,
      ip_address: ipAddress,
      mac_address: macAddress,
      firmware_version: firmwareVersion,
      status,
    } = data;

    try {
      const { pool } = require("../config/database");

      // Save to database
      const result = await pool.query(
        `
        INSERT INTO devices (
          device_id, device_name, location, ip_address, mac_address, 
          firmware_version, status, last_seen
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (device_id) DO UPDATE SET
          device_name = EXCLUDED.device_name,
          location = EXCLUDED.location,
          ip_address = EXCLUDED.ip_address,
          mac_address = EXCLUDED.mac_address,
          firmware_version = EXCLUDED.firmware_version,
          status = EXCLUDED.status,
          last_seen = CURRENT_TIMESTAMP,
          username = NULL,
          name = NULL,
          session_id = NULL,
          session_start = NULL,
          nfc_uid = NULL,
          nfc_read_time = NULL
        RETURNING *
        `,
        [
          deviceId,
          deviceName,
          location,
          ipAddress,
          macAddress,
          firmwareVersion,
          status,
        ],
      );

      log(`Device registered in database: ${result.rows[0].device_id}`);

      // Update device manager
      const existingDevice = deviceManager.getDeviceBySocket(socket);
      if (existingDevice) {
        const [oldDeviceId] = existingDevice;
        if (oldDeviceId !== deviceId) {
          deviceManager.updateDeviceId(socket, deviceId);
        }
      } else {
        deviceManager.registerDevice(deviceId, socket, {
          status: "online",
          deviceName,
          location,
        });
      }

      // Add device to its channel
      if (!this.deviceChannels.has(deviceId)) {
        this.deviceChannels.set(deviceId, new Set());
      }
      this.deviceChannels.get(deviceId).add(socket.id);

      // Publish to Redis
      deviceEvents.publishDeviceOnline({ deviceId, ...data });

      // Send confirmation
      socket.emit("register_success", {
        data: {
          deviceId: deviceId,
          registered: true,
          message: "Device registered successfully",
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast to mobile clients
      broadcastToMobileClients(this.clients, {
        type: "device_status",
        data: {
          deviceId: deviceId,
          status: "online",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError(error, "Error registering device");
      socket.emit("registration_error", {
        data: {
          deviceId: deviceId,
          error: "Failed to register device",
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle device status update
  handleDeviceStatusUpdate(data) {
    const { deviceId, status } = data;

    deviceManager.updateDeviceStatus(deviceId, status);

    broadcastToMobileClients(this.clients, {
      type: "device_status",
      data: {
        deviceId: deviceId,
        status: status,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle device heartbeat
  handleDeviceHeartbeat(deviceId, data) {
    log(`Device heartbeat via WebSocket: ${deviceId}`);
    deviceManager.updateLastActivity(deviceId);
  }

  // Handle heartbeat
  handleHeartbeat(socket, clientData) {
    clientData.lastActivity = new Date();
    socket.emit("heartbeat_ack", {
      timestamp: new Date().toISOString(),
    });
  }

  // Handle NFC reading result
  async handleNFCResult(deviceId, data) {
    try {
      log(`NFC result received from device: ${deviceId}`, data);

      // Arduino sends: { deviceId, success, attendanceData: {...} }
      // Extract the actual attendanceData or use data directly if already extracted
      const attendanceData = data.attendanceData || data;

      // Forward to frontend clients
      this.broadcastToChannel(deviceId, {
        type: "attendance_result",
        deviceId,
        success: data.success !== undefined ? data.success : true,
        attendanceData: attendanceData,
        timestamp: new Date().toISOString(),
      });

      // Publish to Redis
      await nfcEvents.publishNFCReading({ deviceId, data: attendanceData });
      await attendanceEvents.publishAttendanceResult({
        deviceId,
        success: data.success !== undefined ? data.success : true,
        attendanceData: attendanceData,
      });

      // Also broadcast to all admin clients
      this.broadcastToAll({
        type: "device_status",
        deviceId,
        status: "online",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError(error, "Error handling NFC result");
    }
  }

  // Handle NFC error
  handleNFCError(deviceId, data) {
    log(`NFC error from device: ${deviceId}`, data);

    this.broadcastToChannel(deviceId, {
      type: "nfc_error",
      deviceId,
      message: data.message || "NFC reading failed",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle NFC trigger from mobile client
  async handleNFCTrigger(data, clientData) {
    log(`NFC trigger from ${clientData.id}:`, data);

    const { deviceId, userId, username, name } = data;

    // Check if device is connected
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      sendToClientById(this.clients, clientData.id, {
        type: "nfc_trigger_error",
        message: "Device not connected or unavailable",
        deviceId,
      });
      return;
    }

    try {
      const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

      // Call backend API to lock device
      const response = await fetch(
        `${BACKEND_URL}/api/devices/${deviceId}/trigger-nfc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, username, name }),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        log(`Device locked for NFC: ${deviceId}`);

        // Send NFC trigger to ESP32
        const nfcMessage = {
          type: "nfc_trigger",
          action: "start_nfc",
          deviceId,
          data: { username, name, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        };

        const deviceSocket =
          this.clients.get(deviceId)?.socket || device?.socket;
        if (deviceSocket && deviceSocket.connected) {
          deviceSocket.emit("message", nfcMessage);
          log(`NFC command sent to device ${deviceId}`);

          // Store session for timeout handling
          sessionManager.createNFCSession(deviceId, {
            clientId: clientData.id,
            userId,
            username,
            name,
            startTime: Date.now(),
          });

          // Set timeout
          const timeoutId = setTimeout(() => {
            this.handleNFCTimeout(
              { deviceId, reason: "no_card_tapped" },
              clientData,
            );
          }, NFC_TIMEOUT);

          sessionManager.storeAckTimeout(`${deviceId}_nfc`, timeoutId);
        } else {
          sendToClientById(this.clients, clientData.id, {
            type: "nfc_trigger_error",
            message: "Failed to send command to device",
            deviceId,
          });
        }
      } else {
        sendToClientById(this.clients, clientData.id, {
          type: "nfc_trigger_error",
          message: result.message || "Failed to lock device",
          deviceId,
        });
      }
    } catch (error) {
      logError(error, "Error triggering NFC");
      sendToClientById(this.clients, clientData.id, {
        type: "nfc_trigger_error",
        message: "Server error",
        deviceId,
      });
    }
  }

  // Handle NFC acknowledgment from ESP32
  handleNFCAcknowledgment(data, clientData) {
    log(`NFC ACK from ${clientData.id}:`, data);

    const { deviceId, success } = data;

    sessionManager.clearAckTimeout(`${deviceId}_nfc_ack`);

    if (success) {
      log(`Device ${deviceId} started reading`);

      const session = sessionManager.getNFCSession(deviceId);
      if (!session) {
        sessionManager.createNFCSession(deviceId, {
          clientId: clientData.id,
          userId: clientData.userId,
          username: clientData.username,
          timestamp: Date.now(),
        });
      }
    } else {
      logError(`Device ${deviceId} failed to start`);
      deviceManager.updateDeviceStatus(deviceId, "error");

      broadcastToMobileClients(this.clients, {
        type: "nfc_error",
        data: { message: "Failed to start NFC reading", deviceId },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle NFC timeout
  handleNFCTimeout(data, clientData) {
    log(`NFC timeout for device ${data.deviceId}:`, data);

    const { deviceId, reason } = data;

    sessionManager.clearAckTimeout(`${deviceId}_nfc`);

    const session = sessionManager.getNFCSession(deviceId);

    deviceManager.updateDeviceStatus(deviceId, "online");
    sessionManager.deleteNFCSession(deviceId);

    if (session && session.clientId) {
      sendToClientById(this.clients, session.clientId, {
        type: "nfc_timeout",
        data: {
          deviceId,
          reason,
          userId: session.userId,
          username: session.username,
          message: "NFC reading timed out - no card was tapped",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle QR trigger from mobile client
  async handleQRTrigger(data, clientData) {
    log(`QR trigger from ${clientData.id}:`, data);

    const { deviceId, userId, username, name } = data;

    // Check if device is connected
    const device = deviceManager.getDevice(deviceId);
    if (!device) {
      sendToClientById(this.clients, clientData.id, {
        type: "qr_trigger_error",
        message: "Device not connected or unavailable",
        deviceId,
      });
      return;
    }

    try {
      const BACKEND_URL = process.env.BACKEND_URL;

      // Call backend API to generate QR and lock device
      const response = await fetch(
        `${BACKEND_URL}/api/devices/${deviceId}/trigger-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, username, name }),
        },
      );

      const result = await response.json();

      if (response.ok && result.success) {
        log(`QR generated for device: ${deviceId}`);

        // Send QR trigger to ESP32
        const qrMessage = {
          type: "qr_trigger",
          action: "display_qr",
          deviceId,
          data: {
            username,
            name,
            qrCode: result.data.qr_code,
            timestamp: result.data.timestamp,
            expiresAt: result.data.expires_at,
          },
          timestamp: new Date().toISOString(),
        };

        const deviceSocket =
          this.clients.get(deviceId)?.socket || device?.socket;
        if (deviceSocket && deviceSocket.connected) {
          deviceSocket.emit("message", qrMessage);
          log(`QR display command sent to device ${deviceId}`);

          // Set timeout
          const timeoutId = setTimeout(() => {
            this.handleQRTimeout(
              { deviceId, reason: "qr_expired" },
              clientData,
            );
          }, QR_TIMEOUT);

          sessionManager.storeAckTimeout(`${deviceId}_qr`, timeoutId);

          // Send success to mobile client
          sendToClientById(this.clients, clientData.id, {
            type: "qr_trigger_success",
            data: {
              deviceId,
              qrCode: result.data.qr_code,
              message: "QR code displayed on device LCD",
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          });
        } else {
          sendToClientById(this.clients, clientData.id, {
            type: "qr_trigger_error",
            message: "Failed to send command to device",
            deviceId,
          });
        }
      } else {
        sendToClientById(this.clients, clientData.id, {
          type: "qr_trigger_error",
          message: result.message || "Failed to generate QR code",
          deviceId,
        });
      }
    } catch (error) {
      logError(error, "Error triggering QR");
      sendToClientById(this.clients, clientData.id, {
        type: "qr_trigger_error",
        message: "Server error",
        deviceId,
      });
    }
  }

  // Handle QR acknowledgment from ESP32
  handleQRAcknowledgment(data, clientData) {
    log(`QR ACK from ${clientData.id}:`, data);

    const { deviceId, qrCode, success } = data;

    sessionManager.clearAckTimeout(`${deviceId}_qr`);

    if (success) {
      log(`Device ${deviceId} displaying QR: ${qrCode}`);

      const device = deviceManager.getDevice(deviceId);
      const deviceName = device?.deviceName || device?.device_name || deviceId;
      const location = device?.location || "Unknown";

      sessionManager.createQRSession(deviceId, {
        clientId: clientData.id,
        qrCode,
        deviceName,
        location,
        timestamp: Date.now(),
      });

      broadcastToMobileClients(this.clients, {
        type: "qr_trigger_success",
        data: {
          deviceId,
          qrCode,
          message: "QR code displayed on device LCD",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      const timeoutId = setTimeout(() => {
        this.handleQRTimeout({ deviceId, reason: "qr_expired" }, clientData);
      }, QR_TIMEOUT);

      sessionManager.storeAckTimeout(`${deviceId}_qr`, timeoutId);
    } else {
      logError(`Device ${deviceId} failed to display`);
      deviceManager.updateDeviceStatus(deviceId, "online");

      broadcastToMobileClients(this.clients, {
        type: "qr_trigger_error",
        data: { message: "Failed to display QR code", deviceId },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle QR timeout
  handleQRTimeout(data, clientData) {
    log(`QR timeout for device ${data.deviceId}:`, data);

    const { deviceId, reason } = data;

    sessionManager.clearAckTimeout(`${deviceId}_qr`);

    deviceManager.updateDeviceStatus(deviceId, "online");
    sessionManager.deleteQRSession(deviceId);

    broadcastToMobileClients(this.clients, {
      type: "qr_timeout",
      data: {
        deviceId,
        reason,
        message: "QR code display timed out",
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle QR scan from mobile client
  async handleQRScan(data, clientData) {
    log(`QR scan from ${clientData.id}:`, data);

    const { qrCode, username, name } = data;

    if (!qrCode || !username) {
      sendToClientById(this.clients, clientData.id, {
        type: "qr_validate_error",
        message: "QR code and username are required",
      });
      return;
    }

    // Find active QR session by QR code
    let matchedDeviceId = null;
    let matchedSession = null;

    for (const [deviceId, session] of sessionManager.qrSessions.entries()) {
      if (session && session.qrCode === qrCode) {
        matchedDeviceId = deviceId;
        matchedSession = session;
        break;
      }
    }

    if (!matchedDeviceId || !matchedSession) {
      sendToClientById(this.clients, clientData.id, {
        type: "qr_validate_error",
        message: "Invalid or expired QR code",
      });
      return;
    }

    log(`Valid QR scan from ${username} for device ${matchedDeviceId}`);

    sessionManager.clearAllDeviceTimeouts(matchedDeviceId);
    sessionManager.deleteQRSession(matchedDeviceId);

    deviceManager.updateDeviceStatus(matchedDeviceId, "online");

    const attendanceData = {
      username,
      name: name || username,
      deviceUID: qrCode,
      deviceName: matchedSession.deviceName || matchedDeviceId,
      location: matchedSession.location || "Unknown",
      timestamp: Date.now(),
      status: "present",
    };

    broadcastToMobileClients(this.clients, {
      type: "attendance_result",
      data: {
        deviceId: matchedDeviceId,
        success: true,
        attendanceData,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    sendToClientById(this.clients, clientData.id, {
      type: "qr_validate_success",
      data: {
        message: "Attendance recorded successfully",
        attendanceData,
      },
      timestamp: new Date().toISOString(),
    });

    // Log attendance to database
    await this.logAttendanceToDatabase(attendanceData, matchedDeviceId);

    // Send reset command to ESP32
    const device = deviceManager.getDevice(matchedDeviceId);
    const deviceSocket = device?.socket;
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit("message", {
        type: "command",
        action: "reset_display",
        deviceId: matchedDeviceId,
        data: {
          message: "Attendance recorded",
          display: "room",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Unlock device in database
    try {
      const { pool } = require("../config/database");
      await pool.query(
        `UPDATE devices SET status = 'online', username = NULL, uid = NULL, session_type = NULL WHERE device_id = $1`,
        [matchedDeviceId],
      );
    } catch (error) {
      logError(error, "Error unlocking device");
    }
  }

  // Log attendance to database
  async logAttendanceToDatabase(attendanceData, deviceId) {
    try {
      const { pool } = require("../config/database");
      const { invalidateCache } = require("../middleware/cache");
      const {
        username,
        name,
        deviceUID,
        timestamp,
        status = "present",
        location,
        deviceName,
      } = attendanceData;

      await pool.query(
        `INSERT INTO attendance_logs 
         (username, name, device_id, device_uid, status, location, device_name, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          username,
          name || "Unknown",
          deviceId,
          deviceUID || null,
          status,
          location || "Unknown",
          deviceName || null,
          timestamp || new Date().toISOString(),
        ],
      );

      // Invalidate cache
      await invalidateCache("cache:/api/attendance-logs*");
      await invalidateCache("cache:/api/attendance-stats*");

      log(`Attendance logged to database for user: ${username}`);
    } catch (error) {
      logError(error, "Error logging attendance to database");
    }
  }

  // Handle attendance result from ESP32
  async handleAttendanceResult(data, clientData) {
    log(`Attendance result from ${clientData.id}:`, data);

    const { deviceId, success, attendanceData, error } = data;

    sessionManager.clearAllDeviceTimeouts(deviceId);
    sessionManager.deleteNFCSession(deviceId);
    sessionManager.deleteQRSession(deviceId);

    deviceManager.updateDeviceStatus(deviceId, "online");

    broadcastToMobileClients(this.clients, {
      type: "attendance_result",
      data: {
        deviceId: deviceId,
        success: success !== undefined ? success : true,
        attendanceData: attendanceData || data,
        error: error || null,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

    if (success && attendanceData) {
      await this.logAttendanceToDatabase(attendanceData, deviceId);
    }

    // Reset device in database
    try {
      const { pool } = require("../config/database");
      await pool.query(
        `UPDATE devices 
         SET status = 'online', 
             username = NULL, 
             name = NULL,
             session_id = NULL,
             session_start = NULL, 
             uid = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE device_id = $1`,
        [deviceId],
      );
    } catch (error) {
      logError(error, "Error resetting device status");
    }
  }

  // Handle QR trigger from mobile client
  async handleQRTriggerFromMobile(socket, deviceId, data) {
    try {
      log(`QR trigger from mobile client for device: ${deviceId}`);
      const { username, name } = data;

      // Import pool for database operations
      const { pool } = require("../config/database");

      // Check if device exists and is online
      const deviceQuery = "SELECT * FROM devices WHERE device_id = $1";
      const deviceResult = await pool.query(deviceQuery, [deviceId]);

      if (deviceResult.rows.length === 0) {
        socket.emit("qr_trigger_error", {
          data: { message: "Device not found", deviceId },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const device = deviceResult.rows[0];

      // Check if device is already in use by another user
      if (device.status === "in_use" && device.username !== username) {
        socket.emit("qr_trigger_error", {
          data: {
            message: "Device is currently in use by another user",
            deviceId,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (device.status !== "online" && device.status !== "in_use") {
        socket.emit("qr_trigger_error", {
          data: {
            message: "Device is not available for QR attendance",
            deviceId,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Generate QR code
      const qrCode = uuidv4().replace(/-/g, "").substring(0, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 1000).toISOString();

      // Lock device in database
      const updateDeviceQuery = `
        UPDATE devices
        SET status = 'in_use',
            username = $1,
            name = $2,
            uid = $3,
            session_type = 'qr',
            session_start = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE device_id = $4
        RETURNING *
      `;

      const updateResult = await pool.query(updateDeviceQuery, [
        username,
        name,
        qrCode,
        deviceId,
      ]);

      log(`Device locked for QR attendance - ID: ${deviceId}, QR: ${qrCode}`);

      // Send QR trigger to ESP32
      const success = this.triggerQR(deviceId, { username, name }, qrCode);

      if (success) {
        socket.emit("qr_trigger_success", {
          data: {
            deviceId,
            qrCode,
            expiresAt,
            message: "QR code generated successfully",
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // Unlock device if failed to send to ESP32
        await pool.query(
          `UPDATE devices SET status = 'online', username = NULL, uid = NULL, session_type = NULL WHERE device_id = $1`,
          [deviceId],
        );

        socket.emit("qr_trigger_error", {
          data: {
            message: "Failed to send QR trigger to device",
            deviceId,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logError(error, "Error handling QR trigger from mobile");
      socket.emit("qr_trigger_error", {
        data: {
          message: "Server error during QR trigger",
          error: error.message,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle QR scan result from ESP32
  async handleQRResult(deviceId, data) {
    log(
      `QR result received from device: ${deviceId}, data: ${JSON.stringify(data)}`,
    );

    this.broadcastToChannel(deviceId, {
      type: "attendance_result",
      deviceId,
      success: data.success !== undefined ? data.success : true,
      attendanceData: data.attendanceData || data,
      timestamp: new Date().toISOString(),
    });

    // Publish to Redis
    await qrEvents.publishQRReading({
      deviceId,
      data: data.attendanceData || data,
    });
    await attendanceEvents.publishAttendanceResult({
      deviceId,
      success: data.success !== undefined ? data.success : true,
      attendanceData: data.attendanceData || data,
    });

    // Also broadcast device status update
    this.broadcastToAll({
      type: "device_status",
      deviceId,
      status: "online",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle disconnection
  async handleDisconnection(socket) {
    const clientData = this.clients.get(socket.id);
    if (!clientData) return;

    log(`Client disconnected: ${clientData.id}`);

    this.clients.delete(socket.id);

    // If ESP32, remove from devices and broadcast offline status
    if (clientData.type === "esp32") {
      const deviceEntry = deviceManager.getDeviceBySocket(socket);

      if (deviceEntry) {
        const [deviceId] = deviceEntry;
        deviceManager.removeDevice(deviceId);

        sessionManager.clearAllDeviceTimeouts(deviceId);

        // Remove from channel
        const channel = this.deviceChannels.get(deviceId);
        if (channel) {
          channel.delete(socket.id);
          if (channel.size === 0) {
            this.deviceChannels.delete(deviceId);
          }
        }

        // Publish to Redis
        await deviceEvents.publishDeviceOffline({ deviceId });

        broadcastToMobileClients(this.clients, {
          type: "device_status",
          data: {
            deviceId,
            status: "offline",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });

        log(`ESP32 device disconnected: ${deviceId}`);
      }
    }
  }

  // Send NFC trigger to specific device
  triggerNFC(deviceId, userData) {
    const clientData = this.clients.get(deviceId);
    const deviceSocket = clientData?.socket;

    if (!deviceSocket || !deviceSocket.connected) {
      log(`Device not connected: ${deviceId}`);
      return false;
    }

    const message = {
      type: "nfc_trigger",
      action: "start_nfc",
      deviceId,
      userData,
      timestamp: new Date().toISOString(),
    };

    try {
      deviceSocket.emit("message", message);
      log(`NFC trigger sent to device: ${deviceId}`);
      return true;
    } catch (error) {
      logError(error, `Failed to send NFC trigger to device: ${deviceId}`);
      return false;
    }
  }

  // Send QR trigger to specific device
  triggerQR(deviceId, userData, qrCode) {
    const clientData = this.clients.get(deviceId);
    const deviceSocket = clientData?.socket;

    log(`[QR Trigger] Checking device connection: ${deviceId}`);
    log(
      `[QR Trigger] Connected devices: ${Array.from(this.clients.keys()).join(", ")}`,
    );

    if (!deviceSocket) {
      log(`[QR Trigger] Device not found in clients: ${deviceId}`);
      return false;
    }

    if (!deviceSocket.connected) {
      log(
        `[QR Trigger] Device Socket not ready: ${deviceId}, connected: ${deviceSocket.connected}`,
      );
      return false;
    }

    const message = {
      type: "qr_trigger",
      action: "display_qr",
      deviceId,
      data: {
        username: userData.username,
        name: userData.name,
        qrCode: qrCode,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 1000).toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    try {
      log(`[QR Trigger] Sending message to device: ${deviceId}`);
      log(`[QR Trigger] Message: ${JSON.stringify(message)}`);
      deviceSocket.emit("message", message);
      log(`QR trigger sent to device: ${deviceId}, QR: ${qrCode}`);
      return true;
    } catch (error) {
      logError(error, `Failed to send QR trigger to device: ${deviceId}`);
      return false;
    }
  }

  // Broadcast to device channel (using Socket.io rooms)
  broadcastToChannel(deviceId, message) {
    if (!this.io) return;
    this.io.to(deviceId).emit("message", message);
  }

  // Broadcast to all connected clients
  broadcastToAll(message) {
    if (!this.io) return;
    this.io.emit("message", message);
  }

  // Handle join chat room
  handleJoinChat(socket, data) {
    const { conversation_id, user_id } = data;
    log(`User ${user_id} joined chat room ${conversation_id}`);

    const roomName = `chat_${conversation_id}`;
    socket.join(roomName);

    // Broadcast to conversation participants
    this.io.to(roomName).emit("message", {
      type: "user_joined",
      data: {
        conversation_id,
        user_id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle leave chat room
  handleLeaveChat(socket, data) {
    const { conversation_id, user_id } = data;
    log(`User ${user_id} left chat room ${conversation_id}`);

    const roomName = `chat_${conversation_id}`;
    socket.leave(roomName);

    // Broadcast to conversation participants
    this.io.to(roomName).emit("message", {
      type: "user_left",
      data: {
        conversation_id,
        user_id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle send message
  async handleSendMessage(socket, data) {
    const { conversation_id, sender_id, message } = data;
    log(`Message sent in conversation ${conversation_id} by user ${sender_id}`);

    const roomName = `chat_${conversation_id}`;

    // Broadcast to conversation participants
    this.io.to(roomName).emit("message", {
      type: "new_message",
      data: {
        conversation_id,
        sender_id,
        message,
      },
      timestamp: new Date().toISOString(),
    });

    // Publish to Redis
    await chatEvents.publishNewMessage({
      conversation_id,
      sender_id,
      message,
    });
  }

  // Handle edit message
  handleEditMessage(socket, data) {
    const { message_id, user_id, new_message } = data;
    log(`Message ${message_id} edited by user ${user_id}`);

    // Broadcast to all clients (conversation_id not available in edit message)
    this.broadcastToAll({
      type: "message_edited",
      data: {
        message_id,
        user_id,
        new_message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle recall message
  handleRecallMessage(socket, data) {
    const { message_id, user_id } = data;
    log(`Message ${message_id} recalled by user ${user_id}`);

    // Broadcast to all clients
    this.broadcastToAll({
      type: "message_recalled",
      data: {
        message_id,
        user_id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Handle delete message
  handleDeleteMessage(socket, data) {
    const { message_id, user_id } = data;
    log(`Message ${message_id} deleted by user ${user_id}`);

    // Broadcast to all clients
    this.broadcastToAll({
      type: "message_deleted",
      data: {
        message_id,
        user_id,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Generate unique client ID
  generateClientId() {
    return `${Date.now()}-${uuidv4()}`;
  }

  // Get WebSocket server info
  getServerInfo() {
    return {
      connectedClients: this.clients.size,
      connectedDevices: this.devices.size,
      supportedEvents: [
        "attendance",
        "nfc_trigger",
        "qr_trigger",
        "device_register",
        "heartbeat",
      ],
    };
  }
}

// Export singleton instance
const websocketService = new WebSocketServer();
module.exports = websocketService;
