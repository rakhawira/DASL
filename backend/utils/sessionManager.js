/**
 * Session Manager Utility
 * Manages active sessions (NFC and QR)
 */

// Session storage
const nfcSessions = new Map();
const qrSessions = new Map();
const ackTimeouts = new Map();

/**
 * Create a new session
 * @param {Map} sessions - Session storage (nfcSessions or qrSessions)
 * @param {string} deviceId - Device identifier
 * @param {Object} sessionData - Session information
 */
function createSession(sessions, deviceId, sessionData) {
  sessions.set(deviceId, {
    ...sessionData,
    timestamp: Date.now(),
  });
}

/**
 * Get session data
 * @param {Map} sessions - Session storage
 * @param {string} deviceId - Device identifier
 * @returns {Object|undefined} - Session data
 */
function getSession(sessions, deviceId) {
  return sessions.get(deviceId);
}

/**
 * Delete session
 * @param {Map} sessions - Session storage
 * @param {string} deviceId - Device identifier
 */
function deleteSession(sessions, deviceId) {
  sessions.delete(deviceId);
}

/**
 * Store ACK timeout
 * @param {string} key - Timeout key (e.g., "deviceId_nfc" or "deviceId_qr")
 * @param {Timeout} timeout - Timeout object
 */
function storeAckTimeout(key, timeout) {
  // Clear existing timeout if exists
  clearAckTimeout(key);
  ackTimeouts.set(key, timeout);
}

/**
 * Get ACK timeout
 * @param {string} key - Timeout key
 * @returns {Timeout|undefined}
 */
function getAckTimeout(key) {
  return ackTimeouts.get(key);
}

/**
 * Clear ACK timeout
 * @param {string} key - Timeout key
 */
function clearAckTimeout(key) {
  const timeout = ackTimeouts.get(key);
  if (timeout) {
    clearTimeout(timeout);
    ackTimeouts.delete(key);
  }
}

/**
 * Clear all timeouts for a device
 * @param {string} deviceId - Device identifier
 */
function clearAllDeviceTimeouts(deviceId) {
  clearAckTimeout(`${deviceId}_nfc`);
  clearAckTimeout(`${deviceId}_qr`);
}

/**
 * Check if session exists
 * @param {Map} sessions - Session storage
 * @param {string} deviceId - Device identifier
 * @returns {boolean}
 */
function hasSession(sessions, deviceId) {
  return sessions.has(deviceId);
}

// NFC Session specific functions
const createNFCSession = (deviceId, data) =>
  createSession(nfcSessions, deviceId, data);
const getNFCSession = (deviceId) => getSession(nfcSessions, deviceId);
const deleteNFCSession = (deviceId) => deleteSession(nfcSessions, deviceId);
const hasNFCSession = (deviceId) => hasSession(nfcSessions, deviceId);

// QR Session specific functions
const createQRSession = (deviceId, data) =>
  createSession(qrSessions, deviceId, data);
const getQRSession = (deviceId) => getSession(qrSessions, deviceId);
const deleteQRSession = (deviceId) => deleteSession(qrSessions, deviceId);
const hasQRSession = (deviceId) => hasSession(qrSessions, deviceId);

module.exports = {
  nfcSessions,
  qrSessions,
  ackTimeouts,
  // Generic functions
  createSession,
  getSession,
  deleteSession,
  hasSession,
  storeAckTimeout,
  getAckTimeout,
  clearAckTimeout,
  clearAllDeviceTimeouts,
  // NFC specific
  createNFCSession,
  getNFCSession,
  deleteNFCSession,
  hasNFCSession,
  // QR specific
  createQRSession,
  getQRSession,
  deleteQRSession,
  hasQRSession,
};
