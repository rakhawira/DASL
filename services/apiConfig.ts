import { BASE_URL } from "./api";

// API Configuration Constants
export const API_CONFIG = {
  BASE_URL: BASE_URL + "/api", // Development HTTP (192.168.110.189:3001)
  TIMEOUT: 0, // Disabled timeout untuk mencegah data tidak muncul
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  NETWORK_ERROR: 0,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: {
    EN: "Network error. Please check your connection.",
    ID: "Error jaringan. Silakan periksa koneksi Anda.",
  },
  INVALID_CREDENTIALS: {
    EN: "Invalid username or password",
    ID: "Username atau password tidak valid",
  },
  SESSION_EXPIRED: {
    EN: "Session expired. Please login again.",
    ID: "Sesi berakhir. Silakan login kembali.",
  },
  SERVER_ERROR: {
    EN: "Server error. Please try again later.",
    ID: "Error server. Silakan coba lagi nanti.",
  },
  UNKNOWN_ERROR: {
    EN: "An unknown error occurred.",
    ID: "Terjadi error yang tidak diketahui.",
  },
};

export default API_CONFIG;
