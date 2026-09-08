import { io, Socket } from "socket.io-client";
import { Device } from "../types/device";
import { BASE_URL } from "./api";

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
}

export interface DeviceStatusMessage {
  deviceId: string;
  status: "online" | "offline" | "in_use" | "error";
  currentUser?: string; // username (NIM)
  timestamp: string;
}

export interface AttendanceResultMessage {
  deviceId: string;
  success: boolean;
  attendanceData?: {
    username: string; // NIM
    name: string; // Full Name
    deviceUID: string;
    timestamp: number;
    deviceName: string;
    location: string;
  };
  error?: string;
  errorCode?: string;
  timestamp: string;
}

export interface NFCTimeoutMessage {
  deviceId: string;
  message: string;
  reason?: string;
  timestamp: string;
}

export interface NFCErrorMessage {
  deviceId: string;
  message: string;
  timestamp: string;
}

export interface NFCTriggerMessage {
  deviceId: string;
  userId: string;
  username: string;
}

export interface ChatMessageData {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  created_at: string;
  is_edited: boolean;
  is_recalled: boolean;
  is_deleted: boolean;
}

export interface NewChatMessage {
  type: "new_message";
  data: ChatMessageData;
  timestamp: string;
}

export interface EditedChatMessage {
  type: "message_edited";
  data: ChatMessageData;
  timestamp: string;
}

export interface RecalledChatMessage {
  type: "message_recalled";
  data: {
    id: number;
    conversation_id: number;
  };
  timestamp: string;
}

export interface DeletedChatMessage {
  type: "message_deleted";
  data: {
    id: number;
    conversation_id: number;
    user_id: number;
  };
  timestamp: string;
}

export interface ConversationUpdate {
  type: "conversation_updated";
  data: {
    id: number;
    last_message: string;
    last_message_at: string;
    last_message_sender_name?: string;
    unread_count?: number;
  };
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];

  constructor() {
    this.setupMessageHandlers();
  }

  // Socket.io server URL (uses same HTTP URL as BASE_URL)
  private getWebSocketUrl(): string {
    return BASE_URL;
  }

  // Setup default message handlers - only log when WebSocket is actively being used
  private setupMessageHandlers() {
    // Only log connection events, not data events
    // Data event handlers should be registered by components that need them
    // This prevents unwanted logs when WebSocket is not being used by AttendanceShared
  }

  // Connect to Socket.io server
  async connect(): Promise<boolean> {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return true;
    }

    this.isConnecting = true;

    try {
      console.log("[Socket.io] Connecting to server...");

      this.socket = io(this.getWebSocketUrl(), {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 10000,
      });

      return new Promise((resolve, reject) => {
        this.socket!.on("connect", () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log("[Socket.io] Connected successfully");

          // Start heartbeat
          this.startHeartbeat();

          // Notify connection handlers
          this.connectionHandlers.forEach((handler) => handler(true));

          resolve(true);
        });

        this.socket!.on("connect_error", (error) => {
          console.error("[Socket.io] Connection error:", error);
          reject(error);
        });

        this.socket!.on("disconnect", (reason) => {
          this.isConnecting = false;
          console.log("[Socket.io] Disconnected:", reason);

          // Stop heartbeat
          this.stopHeartbeat();

          // Notify connection handlers
          this.connectionHandlers.forEach((handler) => handler(false));
        });

        this.socket!.on("message", (message: any) => {
          try {
            this.handleMessage(message);
          } catch (error) {
            console.error("[Socket.io] Error parsing message:", error);
          }
        });
      });
    } catch (error: any) {
      this.isConnecting = false;
      console.error("[Socket.io] Failed to connect:", error);
      throw error;
    }
  }

  // Disconnect from Socket.io server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopHeartbeat();
  }

  // Start heartbeat
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit("message", {
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Handle incoming messages
  private handleMessage(message: WebSocketMessage) {
    console.log("[WebSocket] ========================================");
    console.log("[WebSocket] Message Received");
    console.log("[WebSocket] Type:", message.type);
    console.log("[WebSocket] Data:", JSON.stringify(message.data, null, 2));
    console.log("[WebSocket] ========================================");

    const handlers = this.messageHandlers.get(message.type);
    if (handlers && handlers.size > 0) {
      console.log(`[WebSocket] Found ${handlers.size} handlers for type: ${message.type}`);
      // Pass entire message (not just message.data) so handlers can access all fields
      handlers.forEach((handler) => handler(message));
    } else {
      console.log("[WebSocket] Unhandled message type:", message.type, message);
    }
  }

  // Send message to server
  sendMessage(type: string, data?: any): boolean {
    if (this.socket && this.socket.connected) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      this.socket.emit("message", message);
      console.log("[Socket.io] Message sent:", message);
      return true;
    } else {
      console.error("[Socket.io] Cannot send message - not connected");
      return false;
    }
  }

  // Trigger NFC attendance
  triggerNFCAttendance(device: Device, user: any): boolean {
    return this.sendMessage("nfc_trigger", {
      deviceId: device.device_id,
      username: user.username, // Username (NIM)
      name: user.name, // Full name
    });
  }

  // Trigger QR attendance
  triggerQRAttendance(device: Device, user: any): boolean {
    return this.sendMessage("qr_trigger", {
      deviceId: device.device_id,
      username: user.username, // Username (NIM)
      name: user.name, // Full name
    });
  }

  // Submit scanned QR code for validation
  submitScannedQR(qrCode: string, username: string, name: string): boolean {
    console.log("[WebSocket] ========================================");
    console.log("[WebSocket] Submitting Scanned QR for Validation");
    console.log("[WebSocket] QR Code:", qrCode);
    console.log("[WebSocket] Username:", username);
    console.log("[WebSocket] Name:", name);
    console.log("[WebSocket] Connection State:", this.getConnectionState());
    console.log("[WebSocket] ========================================");

    const result = this.sendMessage("qr_validate", {
      qrCode,
      username,
      name,
      timestamp: Date.now(),
    });

    console.log("[WebSocket] Send result:", result);
    return result;
  }

  // Send chat message
  sendChatMessage(
    conversationId: number,
    senderId: number,
    message: string,
  ): boolean {
    return this.sendMessage("send_message", {
      conversation_id: conversationId,
      sender_id: senderId,
      message,
    });
  }

  // Edit chat message
  editChatMessage(
    messageId: number,
    userId: number,
    newMessage: string,
  ): boolean {
    return this.sendMessage("edit_message", {
      message_id: messageId,
      user_id: userId,
      new_message: newMessage,
    });
  }

  // Recall chat message (delete for everyone)
  recallChatMessage(messageId: number, userId: number): boolean {
    return this.sendMessage("recall_message", {
      message_id: messageId,
      user_id: userId,
    });
  }

  // Delete chat message for self
  deleteChatMessage(messageId: number, userId: number): boolean {
    return this.sendMessage("delete_message", {
      message_id: messageId,
      user_id: userId,
    });
  }

  // Join chat room for a conversation
  joinChatRoom(conversationId: number, userId: number): boolean {
    if (this.socket && this.socket.connected) {
      const roomName = `chat_${conversationId}`;
      this.socket.emit("join_room", roomName);
      console.log(`[Socket.io] Joined room: ${roomName}`);
      return true;
    }
    return false;
  }

  // Leave chat room for a conversation
  leaveChatRoom(conversationId: number, userId: number): boolean {
    if (this.socket && this.socket.connected) {
      const roomName = `chat_${conversationId}`;
      this.socket.emit("leave_room", roomName);
      console.log(`[Socket.io] Left room: ${roomName}`);
      return true;
    }
    return false;
  }

  // Register message handler (returns unsubscribe function)
  onMessage(type: string, handler: (data: any) => void): () => void {
    const existing = this.messageHandlers.get(type);
    if (existing) {
      existing.add(handler);
    } else {
      this.messageHandlers.set(type, new Set([handler]));
    }

    return () => {
      this.offMessage(type, handler);
    };
  }

  // Remove message handler
  offMessage(type: string, handler?: (data: any) => void) {
    const existing = this.messageHandlers.get(type);
    if (!existing) return;

    if (!handler) {
      this.messageHandlers.delete(type);
      return;
    }

    existing.delete(handler);

    if (existing.size === 0) {
      this.messageHandlers.delete(type);
    }
  }

  // Register connection handler
  onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
  }

  // Remove connection handler
  offConnection(handler: (connected: boolean) => void) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  // Get connection state
  getConnectionState(): string {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    return "disconnected";
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
