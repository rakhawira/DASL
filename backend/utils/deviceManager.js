/**
 * Device Manager Utility
 * Manages device connections and status
 */

// Device storage
const devices = new Map();

/**
 * Register a new device connection
 * @param {string} deviceId - Device identifier
 * @param {Socket} socket - Socket.io connection
 * @param {Object} metadata - Additional device info
 */
function registerDevice(deviceId, socket, metadata = {}) {
  devices.set(deviceId, {
    socket,
    deviceId,
    status: metadata.status || "online",
    connectedAt: metadata.connectedAt || new Date(),
    lastActivity: metadata.lastActivity || new Date(),
    ...metadata,
  });
  return devices.get(deviceId);
}

/**
 * Update device ID (used when device sends registration with real ID)
 * @param {Socket} socket - Socket.io connection to find
 * @param {string} newDeviceId - New device ID
 * @returns {boolean} - Success status
 */
function updateDeviceId(socket, newDeviceId) {
  const deviceEntry = Array.from(devices.entries()).find(
    ([_, device]) => device.socket === socket,
  );

  if (deviceEntry) {
    const [oldDeviceId, deviceData] = deviceEntry;
    devices.delete(oldDeviceId);
    devices.set(newDeviceId, {
      ...deviceData,
      deviceId: newDeviceId,
    });
    console.log(
      `[DeviceManager] Updated device ID from ${oldDeviceId} to ${newDeviceId}`,
    );
    return true;
  }

  return false;
}

/**
 * Get device by ID
 * @param {string} deviceId - Device identifier
 * @returns {Object|undefined} - Device data
 */
function getDevice(deviceId) {
  return devices.get(deviceId);
}

/**
 * Check if device is connected
 * @param {string} deviceId - Device identifier
 * @returns {boolean}
 */
function isDeviceConnected(deviceId) {
  const device = devices.get(deviceId);
  return device && device.socket && device.socket.connected;
}

/**
 * Update device status
 * @param {string} deviceId - Device identifier
 * @param {string} status - New status
 */
function updateDeviceStatus(deviceId, status) {
  const device = devices.get(deviceId);
  if (device) {
    device.status = status;
    device.lastActivity = new Date();
  }
}

/**
 * Update device last activity
 * @param {string} deviceId - Device identifier
 */
function updateLastActivity(deviceId) {
  const device = devices.get(deviceId);
  if (device) {
    device.lastActivity = new Date();
  }
}

/**
 * Remove device
 * @param {string} deviceId - Device identifier
 */
function removeDevice(deviceId) {
  devices.delete(deviceId);
}

/**
 * Get all connected devices
 * @returns {Map} - All devices
 */
function getAllDevices() {
  return devices;
}

/**
 * Get device by Socket.io connection
 * @param {Socket} socket - Socket.io connection
 * @returns {Array|null} - [deviceId, deviceData] or null
 */
function getDeviceBySocket(socket) {
  return (
    Array.from(devices.entries()).find(
      ([_, device]) => device.socket === socket,
    ) || null
  );
}

/**
 * Get device by WebSocket connection (legacy compatibility)
 * @param {WebSocket} ws - WebSocket connection
 * @returns {Array|null} - [deviceId, deviceData] or null
 */
function getDeviceByWebSocket(ws) {
  // For backward compatibility, redirect to getDeviceBySocket
  return getDeviceBySocket(ws);
}

module.exports = {
  devices,
  registerDevice,
  updateDeviceId,
  getDevice,
  isDeviceConnected,
  updateDeviceStatus,
  updateLastActivity,
  removeDevice,
  getAllDevices,
  getDeviceBySocket,
  getDeviceByWebSocket, // Legacy compatibility
};
