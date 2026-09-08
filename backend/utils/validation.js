const {
  VALID_ACTIVITY_TYPES,
  VALID_DEVICE_STATUSES,
  SKS,
} = require("../config/constants");

const isValidActivityType = (type) => {
  return VALID_ACTIVITY_TYPES.includes(type);
};

const isValidDeviceStatus = (status) => {
  return VALID_DEVICE_STATUSES.includes(status);
};

const isValidSks = (sks) => {
  return typeof sks === "number" && sks >= SKS.MIN && sks <= SKS.MAX;
};

const validateRequiredFields = (data, requiredFields) => {
  const missing = [];
  for (const field of requiredFields) {
    if (!data[field] || data[field] === "") {
      missing.push(field);
    }
  }
  return missing;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateNumericId = (id) => {
  return id && !isNaN(Number(id));
};

const sanitizeString = (str) => {
  return str ? str.trim() : "";
};

module.exports = {
  isValidActivityType,
  isValidDeviceStatus,
  isValidSks,
  validateRequiredFields,
  validateEmail,
  validateNumericId,
  sanitizeString,
};
