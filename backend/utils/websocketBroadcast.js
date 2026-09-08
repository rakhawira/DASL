/**
 * Broadcast Utility
 * Handles broadcasting messages to Socket.io clients
 */

/**
 * Broadcast message to all connected clients
 * @param {Map} clients - Map of all clients (socket.id -> clientData)
 * @param {Object} message - Message to broadcast
 * @param {string} excludeId - Client ID to exclude (optional)
 */
function broadcastToAll(clients, message, excludeId = null) {
  clients.forEach((clientData, socketId) => {
    if (
      socketId !== excludeId &&
      clientData.socket &&
      clientData.socket.connected
    ) {
      clientData.socket.emit("message", message);
    }
  });
}

/**
 * Broadcast message to mobile clients only
 * @param {Map} clients - Map of all clients (socket.id -> clientData)
 * @param {Object} message - Message to broadcast
 * @param {string} excludeId - Client ID to exclude (optional)
 */
function broadcastToMobileClients(clients, message, excludeId = null) {
  clients.forEach((clientData, socketId) => {
    if (
      clientData.type === "mobile" &&
      socketId !== excludeId &&
      clientData.socket &&
      clientData.socket.connected
    ) {
      clientData.socket.emit("message", message);
    }
  });
}

/**
 * Broadcast message to a specific device channel
 * Note: This function is now deprecated in favor of Socket.io rooms
 * @param {Map} deviceChannels - Map of device channels (deviceId -> Set of socket IDs)
 * @param {string} deviceId - Device identifier
 * @param {Object} message - Message to broadcast
 */
function broadcastToChannel(deviceChannels, deviceId, message) {
  const channel = deviceChannels.get(deviceId);
  if (!channel) return;

  channel.forEach((socketId) => {
    // This function is now less useful with Socket.io rooms
    // Kept for backward compatibility
    // The websocketService now uses io.to(deviceId).emit() directly
  });
}

/**
 * Send message to specific client by ID
 * @param {Map} clients - Map of all clients (socket.id -> clientData)
 * @param {string} clientId - Target client ID (socket.id)
 * @param {Object} message - Message to send
 * @returns {boolean} - Success status
 */
function sendToClientById(clients, clientId, message) {
  const clientData = clients.get(clientId);

  if (clientData && clientData.socket && clientData.socket.connected) {
    clientData.socket.emit("message", message);
    return true;
  }
  return false;
}

/**
 * Send message to ESP32 device
 * @param {Map} devices - Map of devices
 * @param {string} deviceId - Device identifier
 * @param {Object} message - Message to send
 * @returns {boolean} - Success status
 */
function sendToESP32Device(devices, deviceId, message) {
  const device = devices.get(deviceId);
  if (device && device.socket && device.socket.connected) {
    device.socket.emit("message", message);
    console.log(
      `[Broadcast] Sent message to ESP32 device ${deviceId}:`,
      message.type,
    );
    return true;
  } else {
    console.log(
      `[Broadcast] ESP32 device ${deviceId} not found or not connected`,
    );
    return false;
  }
}

module.exports = {
  broadcastToAll,
  broadcastToMobileClients,
  broadcastToChannel,
  sendToClientById,
  sendToESP32Device,
};
