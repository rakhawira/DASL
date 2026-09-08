// Session timeout in milliseconds (1 month)
const DEFAULT_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000;

// Device offline timeout in milliseconds (60 seconds)
const DEVICE_OFFLINE_TIMEOUT = 60 * 1000;

// Valid activity types
const VALID_ACTIVITY_TYPES = [
  "lecture",
  "lab",
  "seminar",
  "workshop",
  "assignment",
  "exam",
];

// Valid device statuses
const VALID_DEVICE_STATUSES = [
  "online",
  "offline",
  "in_use",
  "maintenance",
  "error",
];

// SKS (Satuan Kredit Semester) range
const SKS = {
  MIN: 1,
  MAX: 24,
};

module.exports = {
  DEFAULT_SESSION_TIMEOUT,
  DEVICE_OFFLINE_TIMEOUT,
  VALID_ACTIVITY_TYPES,
  VALID_DEVICE_STATUSES,
  SKS,
};
