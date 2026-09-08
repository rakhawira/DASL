const { pubsub } = require("../config/redis");
const { log, logError } = require("../utils/logger");

// Channel names for different event types
const CHANNELS = {
  ATTENDANCE: "attendance:events",
  NFC: "nfc:events",
  QR: "qr:events",
  CHAT: "chat:events",
  DEVICE: "device:events",
  NEWS: "news:events",
  NOTIFICATION: "notification:events",
};

/**
 * Publish event to Redis Pub/Sub
 * @param {string} channel - Channel name
 * @param {object} data - Event data
 */
const publishEvent = async (channel, data) => {
  try {
    const success = await pubsub.publish(channel, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    if (success) {
      log(`Event published to channel: ${channel}`);
    }
    return success;
  } catch (error) {
    logError(error, `Failed to publish event to channel: ${channel}`);
    return false;
  }
};

/**
 * Subscribe to Redis Pub/Sub channel
 * @param {string} channel - Channel name
 * @param {function} callback - Callback function for incoming messages
 */
const subscribeToChannel = async (channel, callback) => {
  try {
    const success = await pubsub.subscribe(channel, callback);
    if (success) {
      log(`Subscribed to channel: ${channel}`);
    }
    return success;
  } catch (error) {
    logError(error, `Failed to subscribe to channel: ${channel}`);
    return false;
  }
};

/**
 * Unsubscribe from Redis Pub/Sub channel
 * @param {string} channel - Channel name
 */
const unsubscribeFromChannel = async (channel) => {
  try {
    const success = await pubsub.unsubscribe(channel);
    if (success) {
      log(`Unsubscribed from channel: ${channel}`);
    }
    return success;
  } catch (error) {
    logError(error, `Failed to unsubscribe from channel: ${channel}`);
    return false;
  }
};

/**
 * Attendance event publishers
 */
const attendanceEvents = {
  publishAttendanceResult: async (data) => {
    return await publishEvent(CHANNELS.ATTENDANCE, {
      type: "attendance_result",
      ...data,
    });
  },

  publishAttendanceUpdate: async (data) => {
    return await publishEvent(CHANNELS.ATTENDANCE, {
      type: "attendance_update",
      ...data,
    });
  },
};

/**
 * NFC event publishers
 */
const nfcEvents = {
  publishNFCReading: async (data) => {
    return await publishEvent(CHANNELS.NFC, {
      type: "nfc_reading",
      ...data,
    });
  },

  publishNFCStatus: async (data) => {
    return await publishEvent(CHANNELS.NFC, {
      type: "nfc_status",
      ...data,
    });
  },
};

/**
 * QR event publishers
 */
const qrEvents = {
  publishQRReading: async (data) => {
    return await publishEvent(CHANNELS.QR, {
      type: "qr_reading",
      ...data,
    });
  },

  publishQRStatus: async (data) => {
    return await publishEvent(CHANNELS.QR, {
      type: "qr_status",
      ...data,
    });
  },
};

/**
 * Chat event publishers
 */
const chatEvents = {
  publishNewMessage: async (data) => {
    return await publishEvent(CHANNELS.CHAT, {
      type: "new_message",
      ...data,
    });
  },

  publishMessageRead: async (data) => {
    return await publishEvent(CHANNELS.CHAT, {
      type: "message_read",
      ...data,
    });
  },
};

/**
 * Device event publishers
 */
const deviceEvents = {
  publishDeviceOnline: async (data) => {
    return await publishEvent(CHANNELS.DEVICE, {
      type: "device_online",
      ...data,
    });
  },

  publishDeviceOffline: async (data) => {
    return await publishEvent(CHANNELS.DEVICE, {
      type: "device_offline",
      ...data,
    });
  },

  publishDeviceHeartbeat: async (data) => {
    return await publishEvent(CHANNELS.DEVICE, {
      type: "device_heartbeat",
      ...data,
    });
  },
};

/**
 * News event publishers
 */
const newsEvents = {
  publishNewsUpdate: async (data) => {
    return await publishEvent(CHANNELS.NEWS, {
      type: "news_update",
      ...data,
    });
  },

  publishNewsCreated: async (data) => {
    return await publishEvent(CHANNELS.NEWS, {
      type: "news_created",
      ...data,
    });
  },
};

/**
 * Notification event publishers
 */
const notificationEvents = {
  publishNotification: async (data) => {
    return await publishEvent(CHANNELS.NOTIFICATION, {
      type: "notification",
      ...data,
    });
  },

  publishBroadcast: async (data) => {
    return await publishEvent(CHANNELS.NOTIFICATION, {
      type: "broadcast",
      ...data,
    });
  },
};

module.exports = {
  CHANNELS,
  publishEvent,
  subscribeToChannel,
  unsubscribeFromChannel,
  attendanceEvents,
  nfcEvents,
  qrEvents,
  chatEvents,
  deviceEvents,
  newsEvents,
  notificationEvents,
};
