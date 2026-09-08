const crypto = require('crypto');

// Get encryption key from environment or use default
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-byte-encryption-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Ensure key is 32 bytes for AES-256
const getKey = () => {
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  if (key.length < 32) {
    // Pad with zeros if too short
    const padded = Buffer.alloc(32);
    key.copy(padded);
    return padded;
  }
  if (key.length > 32) {
    // Truncate if too long
    return key.subarray(0, 32);
  }
  return key;
};

/**
 * Encrypt text using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:encrypted
 */
const encrypt = (text) => {
  try {
    if (!text) return text;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv:encrypted format
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt text using AES-256-CBC
 * @param {string} encryptedText - Encrypted text in format: iv:encrypted
 * @returns {string} - Decrypted plain text
 */
const decrypt = (encryptedText) => {
  try {
    if (!encryptedText) return encryptedText;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // If not in encrypted format, return as-is (for backward compatibility)
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = getKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, return original text (for backward compatibility)
    return encryptedText;
  }
};

/**
 * Encrypt multiple fields in an object
 * @param {object} obj - Object to encrypt
 * @param {array} fields - Array of field names to encrypt
 * @returns {object} - Object with encrypted fields
 */
const encryptFields = (obj, fields) => {
  const result = { ...obj };
  fields.forEach(field => {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  });
  return result;
};

/**
 * Decrypt multiple fields in an object
 * @param {object} obj - Object to decrypt
 * @param {array} fields - Array of field names to decrypt
 * @returns {object} - Object with decrypted fields
 */
const decryptFields = (obj, fields) => {
  const result = { ...obj };
  fields.forEach(field => {
    if (result[field]) {
      result[field] = decrypt(result[field]);
    }
  });
  return result;
};

/**
 * Decrypt array of objects
 * @param {array} arr - Array of objects to decrypt
 * @param {array} fields - Array of field names to decrypt
 * @returns {array} - Array with decrypted fields
 */
const decryptArray = (arr, fields) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => decryptFields(item, fields));
};

module.exports = {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  decryptArray
};
