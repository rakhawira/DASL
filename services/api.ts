import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { CreateCourse, UpdateCourse } from "../types/course";
import { CreateUser, LoginCredentials, User } from "../types/user";

// URLs from environment variables
const Local = process.env.EXPO_PUBLIC_DEV_API_URL;
const Production = process.env.EXPO_PUBLIC_API_URL;

export const BASE_URL = Production;

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Increased default timeout
  withCredentials: false, // Important for CORS
});

// Add request interceptor for better error handling
api.interceptors.request.use(
  (config) => {
    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API] Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`,
    );
    return response;
  },
  (error) => {
    if (error.code === "NETWORK_ERROR" || !error.response) {
      console.error(
        "[API] Network Error - Please check your internet connection",
      );
    } else if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout - Please try again");
    } else if (error.response) {
      console.error(
        `[API] Server Error: ${error.response.status} - ${error.response.statusText}`,
      );
    } else {
      console.error("[API] Unknown Error:", error.message);
    }
    return Promise.reject(error);
  },
);

// Authentication API functions
export const login = async (credentials: LoginCredentials) => {
  try {
    console.log("Attempting login with:", { username: credentials.username });
    const response = await api.post("/auth/login", credentials);
    console.log("Login API response:", JSON.stringify(response.data, null, 2));

    // Log the user data specifically
    if (response.data && response.data.data && response.data.data.user) {
      console.log(
        "User data from login:",
        JSON.stringify(response.data.data.user, null, 2),
      );
    }

    return response.data;
  } catch (error: any) {
    console.error("Error during login:", error);

    // Better error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Login error response:", error.response.data);
      throw error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Login error request:", error.request);
      throw new Error("Network error. Please check your connection.");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Login error setup:", error.message);
      throw error;
    }
  }
};

export const cancelNFCAttendance = async (
  device_id: string,
  username: string,
) => {
  try {
    const response = await api.post("/api/nfc/cancel", { device_id, username });
    return response.data;
  } catch (error) {
    console.error("Error cancelling NFC attendance:", error);
    throw error;
  }
};

export const logout = async (sessionId: string) => {
  try {
    const response = await api.post("/auth/logout", { sessionId });
    return response.data;
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
};

export const verifySession = async (sessionId: string) => {
  try {
    const response = await api.get("/auth/verify", {
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error verifying session:", error);
    throw error;
  }
};

// Course Management API functions
export const getCourses = async () => {
  try {
    const response = await api.get("/api/courses");
    return response.data;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

export const getCourseById = async (id: number) => {
  try {
    const response = await api.get(`/api/courses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching course ${id}:`, error);
    throw error;
  }
};

export const createCourse = async (
  courseData: CreateCourse & { is_active?: boolean },
) => {
  try {
    const response = await api.post("/api/courses", courseData);
    return response.data;
  } catch (error) {
    console.error("Error creating course:", error);
    throw error;
  }
};

export const updateCourse = async (id: number, courseData: UpdateCourse) => {
  try {
    const response = await api.put(`/api/courses/${id}`, courseData);
    return response.data;
  } catch (error) {
    console.error("Error updating course:", error);
    throw error;
  }
};

export const deleteCourse = async (id: number) => {
  try {
    const response = await api.delete(`/api/courses/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting course:", error);
    throw error;
  }
};

export const toggleCourseStatus = async (id: number) => {
  try {
    const response = await api.patch(`/api/courses/${id}/toggle-status`);
    return response.data;
  } catch (error) {
    console.error("Error toggling course status:", error);
    throw error;
  }
};

// CRUD API GET, POST, PUT, DELETE with proper error handling
export const getUsers = async () => {
  try {
    const response = await api.get("/api/users");
    return response.data;
  } catch (error) {
    // Silent handling - don't log to avoid console spam
    // Return fallback data instead of throwing
    return {
      success: false,
      data: [],
      message: "Users endpoint unavailable",
    };
  }
};

export const getUserById = async (id: number) => {
  try {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

export const createUser = async (user: CreateUser) => {
  try {
    const response = await api.post("/api/users", user);
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (user: User & { password?: string }) => {
  try {
    const response = await api.put(`/api/users/${user.id}`, user);
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id: number) => {
  try {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Attendance Logs API functions
export const getAttendanceLogs = async (params?: {
  page?: number;
  limit?: number;
  user_id?: string; // Filter by username (NIM)
  date_from?: string;
  date_to?: string;
  device_uid?: string; // Added device_uid filter
}) => {
  try {
    const response = await api.get("/api/attendance-logs", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    throw error;
  }
};

export const getAttendanceByDeviceUID = async (device_uid: string) => {
  try {
    const response = await api.get(
      `/api/attendance-logs/by-device-uid/${device_uid}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance by device UID:", error);
    throw error;
  }
};

export const createAttendanceLog = async (data: {
  username: string; // Changed from user_id to username
  name?: string; // Added name field
  status?: string;
  location?: string;
  device_info?: string;
  ip_address?: string;
  device_uid?: string;
  device_name?: string; // Added device_name field
}) => {
  try {
    const response = await api.post("/api/attendance-logs", data);
    return response.data;
  } catch (error) {
    console.error("Error creating attendance log:", error);
    throw error;
  }
};

// Create smartphone tap attendance log
export const createSmartphoneTapAttendance = async (data: {
  username: string; // Changed from userId to username (NIM)
  name: string; // Added name field
  deviceUID: string;
  deviceId: string;
  deviceName: string;
  location: string;
  timestamp: number;
}) => {
  try {
    const payload = {
      username: data.username,
      name: data.name,
      status: "present",
      location: data.location,
      device_info: `${data.deviceName} (${data.deviceId})`,
      device_uid: data.deviceUID,
      device_name: data.deviceName,
      timestamp: data.timestamp,
      date: new Date(data.timestamp).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      check_time: new Date(data.timestamp).toISOString(),
    };

    const response = await api.post("/api/attendance-logs", payload);
    console.log("[Backend] Smartphone tap attendance created:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating smartphone tap attendance:", error);
    throw error;
  }
};

// Get recent smartphone tap attendance for notifications
export const getRecentSmartphoneTaps = async (username?: string) => {
  try {
    const params: any = {
      status: "present",
      limit: 10,
      sort: "check_time",
      order: "desc",
    };

    if (username) {
      params.username = username; // Use username instead of user_id
    }

    const response = await api.get("/api/attendance-logs", { params });

    // Filter for entries with device_uid (smartphone taps have device_uid set)
    const smartphoneTaps =
      response.data.data?.filter(
        (log: any) => log.device_uid && log.device_uid.length > 0,
      ) || [];

    return {
      success: true,
      data: smartphoneTaps,
    };
  } catch (error) {
    console.error("Error getting recent smartphone taps:", error);
    throw error;
  }
};

export const getAttendanceStats = async (params?: {
  date_from?: string;
  date_to?: string;
}) => {
  try {
    const response = await api.get("/api/attendance-stats", { params });
    return response.data;
  } catch (error) {
    // Silent handling - don't log to avoid console spam
    // Return fallback data instead of throwing
    return {
      success: false,
      data: {
        today_count: 0,
        week_count: 0,
        month_count: 0,
        total_count: 0,
      },
      message: "Stats endpoint unavailable",
    };
  }
};

// News API functions
export const getNews = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) => {
  try {
    const response = await api.get("/api/news", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
};

// Admin News API functions - shows all news (active and inactive)
export const getAdminNews = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) => {
  try {
    const response = await api.get("/api/admin/news", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin news:", error);
    throw error;
  }
};

export const getNewsById = async (id: string) => {
  try {
    const response = await api.get(`/api/news/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching news by ID:", error);
    throw error;
  }
};

export const createNews = async (newsData: {
  title: string;
  content: string;
  category?: string;
  author: string;
  is_active?: boolean;
}) => {
  try {
    const response = await api.post("/api/news", newsData);
    return response.data;
  } catch (error) {
    console.error("Error creating news:", error);
    throw error;
  }
};

export const updateNews = async (
  id: string,
  newsData: {
    title?: string;
    content?: string;
    category?: string;
    author?: string;
    event_date?: string;
    event_start_time?: string;
    event_end_time?: string;
    is_active?: boolean;
  },
) => {
  try {
    const response = await api.put(`/api/news/${id}`, newsData);
    return response.data;
  } catch (error) {
    console.error("Error updating news:", error);
    throw error;
  }
};

export const deleteNews = async (id: string) => {
  try {
    const response = await api.delete(`/api/news/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting news:", error);
    throw error;
  }
};

export const getNewsCategories = async () => {
  try {
    const response = await api.get("/api/news/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching news categories:", error);
    throw error;
  }
};

export const getNewsStats = async () => {
  try {
    const response = await api.get("/api/news/stats");
    return response.data;
  } catch (error) {
    // Silent handling - don't log to avoid console spam
    // Return fallback data instead of throwing
    return {
      success: false,
      data: {
        total_news: 0,
        active_news: 0,
        inactive_news: 0,
      },
      message: "Stats endpoint unavailable",
    };
  }
};

export const getSessionStats = async () => {
  try {
    const response = await api.get("/api/sessions/stats");
    return response.data;
  } catch (error) {
    // Silent handling - don't log to avoid console spam
    // Return fallback data instead of throwing
    return {
      success: false,
      data: {
        total_sessions: 0,
        active_sessions: 0,
        inactive_sessions: 0,
        valid_sessions: 0,
        expired_sessions: 0,
        active_users: 0,
      },
      message: "Session stats endpoint unavailable",
    };
  }
};

// Device Management API functions
export const getDevices = async (params?: {
  status?: string;
  location?: string;
}) => {
  try {
    const response = await api.get("/api/devices", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching devices:", error);
    throw error;
  }
};

export const getDeviceById = async (deviceId: string) => {
  try {
    const response = await api.get(`/api/devices/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching device by ID:", error);
    throw error;
  }
};

export const registerDevice = async (deviceData: {
  device_id: string;
  device_name?: string;
  location?: string;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
}) => {
  try {
    const response = await api.post("/api/devices/register", deviceData);
    return response.data;
  } catch (error) {
    console.error("Error registering device:", error);
    throw error;
  }
};

export const updateDeviceHeartbeat = async (data: {
  device_id: string;
  ip_address?: string;
  status?: string;
}) => {
  try {
    const response = await api.post("/api/devices/heartbeat", data);
    return response.data;
  } catch (error) {
    console.error("Error updating device heartbeat:", error);
    throw error;
  }
};

export const updateDevice = async (
  deviceId: string,
  deviceData: {
    device_name?: string;
    location?: string;
    status?: string;
  },
) => {
  try {
    const response = await api.put(`/api/devices/${deviceId}`, deviceData);
    return response.data;
  } catch (error) {
    console.error("Error updating device:", error);
    throw error;
  }
};

export const deleteDevice = async (deviceId: string) => {
  try {
    const response = await api.delete(`/api/devices/${deviceId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting device:", error);
    throw error;
  }
};

export const updateDeviceStatus = async (
  deviceId: string,
  status: string,
  message?: string,
  currentUser?: string,
  sessionId?: string,
) => {
  try {
    const response = await api.put(`/api/devices/${deviceId}/status`, {
      status: status,
      message: message || `Device status updated to ${status}`,
      currentUser: currentUser,
      sessionId: sessionId,
      ipAddress: null, // Backend akan set dari request
    });
    return response.data;
  } catch (error) {
    console.error("Error updating device status:", error);
    throw error;
  }
};

export const cleanupOfflineDevices = async (timeoutMinutes?: number) => {
  try {
    const response = await api.post("/api/devices/cleanup-offline", {
      timeout_minutes: timeoutMinutes || 5,
    });
    return response.data;
  } catch (error) {
    console.error("Error cleaning up offline devices:", error);
    throw error;
  }
};

// Device Lock/Unlock API functions (HTTP API only)
export const lockDevice = async (
  deviceId: string,
  username: string, // Only username needed
) => {
  try {
    const response = await api.post(`/api/devices/${deviceId}/lock`, {
      username: username, // Only send username
    });
    return response.data;
  } catch (error) {
    console.error("Error locking device:", error);
    throw error;
  }
};

export const unlockDevice = async (deviceId: string, username: string) => {
  try {
    const response = await api.post(`/api/devices/${deviceId}/unlock`, {
      username: username, // Use username instead of user_id
    });
    return response.data;
  } catch (error) {
    console.error("Error unlocking device:", error);
    throw error;
  }
};

// Trigger NFC attendance on device
export const triggerNFCAttendance = async (
  deviceId: string,
  username: string, // Username (NIM)
  name?: string, // Full name (optional)
) => {
  try {
    const response = await api.post(`/api/devices/${deviceId}/trigger-nfc`, {
      username: username, // Username (NIM)
      name: name, // Full name
    });
    return response.data;
  } catch (error) {
    console.error("Error triggering NFC attendance:", error);
    throw error;
  }
};

// Trigger QR attendance on device
export const triggerQRAttendance = async (
  deviceId: string,
  username: string, // Username (NIM)
  name?: string, // Full name (optional)
) => {
  try {
    const response = await api.post(`/api/devices/${deviceId}/trigger-qr`, {
      username: username, // Username (NIM)
      name: name, // Full name
    });
    return response.data;
  } catch (error) {
    console.error("Error triggering QR attendance:", error);
    throw error;
  }
};

// Submit QR attendance directly to backend API (like NFC)
export const submitQRAttendance = async (data: {
  device_id: string;
  qr_data: string;
  username: string;
  name: string;
  timestamp?: number;
}) => {
  try {
    const response = await api.post("/api/qr/process-reading", {
      device_id: data.device_id,
      qr_data: data.qr_data,
      username: data.username,
      name: data.name,
      timestamp: data.timestamp || Date.now(),
    });
    console.log("[API] QR attendance submitted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error submitting QR attendance:", error);
    throw error;
  }
};

// Submit NFC attendance directly to backend API (like QR)
// This can be used as fallback when WebSocket is disconnected
export const submitNFCAttendance = async (data: {
  device_id: string;
  nfc_data: string;
  username: string;
  name: string;
  timestamp?: number;
}) => {
  try {
    const response = await api.post("/api/nfc/process-reading", {
      device_id: data.device_id,
      nfc_data: data.nfc_data,
      username: data.username,
      name: data.name,
      timestamp: data.timestamp || Date.now(),
    });
    console.log("[API] NFC attendance submitted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error submitting NFC attendance:", error);
    throw error;
  }
};

export const getActivityPoints = async (params?: {
  page?: number;
  limit?: number;
  student_id?: string;
  activity_type?: string;
  semester?: string;
  academic_year?: string;
  search?: string;
}) => {
  try {
    const response = await api.get("/api/activity-points", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching activity points:", error);
    throw error;
  }
};

export const addActivityPoint = async (activityData: {
  student_id: number;
  activity_type: string;
  activity_name: string;
  points: number;
  description?: string;
}) => {
  try {
    const response = await api.post("/api/activity-points", activityData);
    return response.data;
  } catch (error) {
    console.error("Error adding activity point:", error);
    throw error;
  }
};

export const updateActivityPoint = async (
  id: number,
  activityData: {
    activity_type?: string;
    activity_name?: string;
    points?: number;
    description?: string;
  },
) => {
  try {
    const response = await api.put(`/api/activity-points/${id}`, activityData);
    return response.data;
  } catch (error) {
    console.error("Error updating activity point:", error);
    throw error;
  }
};

// SSKM Configuration API functions
export const getSSKMConfigs = async () => {
  try {
    const response = await api.get("/api/sskm-config");
    return response.data;
  } catch (error) {
    console.error("Error fetching SSKM configurations:", error);
    throw error;
  }
};

export const updateSSKMConfig = async (
  configKey: string,
  configValue: string,
) => {
  try {
    const response = await api.put(`/api/sskm-config/${configKey}`, {
      configValue,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating SSKM configuration:", error);
    throw error;
  }
};

export const getMaxRequiredPoints = async () => {
  try {
    const response = await api.get("/api/sskm-config/max-points");
    return response.data;
  } catch (error) {
    console.error("Error fetching max required points:", error);
    throw error;
  }
};

export const updateMaxRequiredPoints = async (maxRequiredPoints: number) => {
  try {
    const response = await api.put("/api/sskm-config/max-points", {
      maxRequiredPoints,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating max required points:", error);
    throw error;
  }
};

export const deleteActivityPoint = async (id: number) => {
  try {
    const response = await api.delete(`/api/activity-points/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting activity point:", error);
    throw error;
  }
};

export const getSSKMStats = async () => {
  try {
    const response = await api.get("/api/sskm/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching SSKM stats:", error);
    throw error;
  }
};

export const getStudentActivityPoints = async (
  studentId: number,
  params?: {
    page?: number;
    limit?: number;
  },
) => {
  try {
    const response = await api.get(
      `/api/students/${studentId}/activity-points`,
      {
        params,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching student activity points:", error);
    throw error;
  }
};

// Notifications API functions
export const getNotifications = async (params?: {
  userId?: number;
  username?: string;
  role?: string;
}) => {
  try {
    const response = await api.get("/api/notifications", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

// Session Manager Utility
export const SessionManager = {
  getSession: async () => {
    try {
      // Gunakan AsyncStorage untuk React Native
      const sessionId = await AsyncStorage.getItem("sessionId");
      return sessionId;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  },

  setSession: async (sessionId: string) => {
    try {
      await AsyncStorage.setItem("sessionId", sessionId);
      console.log("Session saved to AsyncStorage:", sessionId);
    } catch (error) {
      console.error("Error setting session:", error);
      throw error;
    }
  },

  clearSession: async () => {
    try {
      console.log("Clearing session from AsyncStorage...");
      await AsyncStorage.removeItem("sessionId");
      await AsyncStorage.removeItem("userData");
      console.log("Session cleared successfully");
    } catch (error) {
      console.error("Error clearing session:", error);
      throw error;
    }
  },

  // New functions for complete user data
  getUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  },

  setUserData: async (user: User) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify(user));
      console.log("User data saved to AsyncStorage:", user);
    } catch (error) {
      console.error("Error setting user data:", error);
      throw error;
    }
  },
};

// Auth API wrapper
export const authAPI = {
  login: async (credentials: LoginCredentials) => {
    try {
      console.log("authAPI.login called with:", credentials.username);
      const response = await login(credentials);
      console.log("authAPI.login response:", response);

      // Handle the actual response structure from API
      if (response && response.success && response.data) {
        // Save session if available
        if (response.data.sessionId) {
          await SessionManager.setSession(response.data.sessionId);
          console.log("Session saved:", response.data.sessionId);
        }

        // Save complete user data if available
        if (response.data.user) {
          await SessionManager.setUserData(response.data.user);
          console.log("Complete user data saved:", response.data.user);
        }

        return response;
      } else {
        throw new Error("Invalid login response format");
      }
    } catch (error: any) {
      console.error("authAPI.login error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const sessionId = await SessionManager.getSession();
      console.log("Logging out with session:", sessionId);

      if (sessionId) {
        try {
          // Call API logout endpoint
          await logout(sessionId);
          console.log("API logout successful");
        } catch (apiError) {
          console.warn(
            "API logout failed, but continuing with local logout:",
            apiError,
          );
          // Continue with local logout even if API call fails
        }

        // Always clear local session
        await SessionManager.clearSession();
        console.log("Local session cleared");
      }

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, try to clear local session
      try {
        await SessionManager.clearSession();
      } catch (clearError) {
        console.error("Failed to clear session:", clearError);
      }
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      // First try to get complete user data from AsyncStorage
      const storedUserData = await SessionManager.getUserData();
      if (storedUserData) {
        console.log("Using stored complete user data:", storedUserData);
        return storedUserData;
      }

      // Fallback to API verification if no stored data
      const sessionId = await SessionManager.getSession();
      if (!sessionId) {
        console.log("No session found in storage");
        return null;
      }

      console.log("Verifying session with API:", sessionId);
      // Gunakan verifySession endpoint untuk mendapatkan user data
      const response = await verifySession(sessionId);
      console.log(
        "getCurrentUser API response:",
        JSON.stringify(response, null, 2),
      );

      // Handle different response structures
      if (response && response.success && response.data && response.data.user) {
        // Save user data for future use
        await SessionManager.setUserData(response.data.user);
        return response.data.user;
      } else if (response && response.success && response.user) {
        // Save user data for future use
        await SessionManager.setUserData(response.user);
        return response.user;
      } else {
        console.error("Invalid response structure:", response);
        return null;
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      // Return null instead of throwing error
      return null;
    }
  },

  register: async (credentials: LoginCredentials) => {
    // Untuk register, kita perlu menambahkan name field
    const userData: CreateUser = {
      username: credentials.username,
      password: credentials.password,
      name: credentials.username, // Default name sama dengan username
      role: "mahasiswa", // Default role
    };
    const response = await createUser(userData);
    if (response.success && response.sessionId) {
      await SessionManager.setSession(response.sessionId);
    }
    return response;
  },

  updateProfile: async (username: string) => {
    // Mock update profile - implement sesuai kebutuhan
    return {
      id: 1,
      username,
      name: "Updated User",
      role: "admin" as const,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};

// NFC Attendance API for direct ESP32 communication
export const sendNFCAttendanceToESP32 = async (
  esp32Url: string,
  attendanceData: {
    userId: string;
    username: string;
    role: string;
    timestamp: number;
    deviceId: string;
    roomCode?: string;
  },
) => {
  try {
    const payload = {
      type: "mobile_attendance",
      data: attendanceData,
      timestamp: Date.now(),
    };

    const response = await axios.post(`${esp32Url}/attendance`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("ESP32 attendance response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending NFC attendance to ESP32:", error);
    throw error;
  }
};

// Request ESP32 to start NFC reading - Direct HTTP API
export const requestESP32NFCReading = async (
  esp32Url: string,
  requestData: {
    userId: string;
    username: string;
    deviceId: string;
    timeout?: number;
  },
) => {
  try {
    console.log("[ESP32] Starting NFC reading request");
    console.log("[ESP32] ESP32 URL:", esp32Url);
    console.log("[ESP32] Request data:", requestData);

    // Send request directly to ESP32 HTTP API
    const response = await axios.post(
      `${esp32Url}/api/nfc/start`,
      {
        userId: requestData.userId,
        username: requestData.username,
        deviceId: requestData.deviceId,
        timeout: requestData.timeout || 30000,
      },
      {
        timeout: 35000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "DASL-Mobile-App/1.0",
        },
      },
    );

    console.log("[ESP32] ESP32 response:", response.data);

    // Validate response structure
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Failed to start NFC reading");
    }
  } catch (error: any) {
    console.error("[ESP32] Error requesting ESP32 NFC reading:", error);

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      console.error(
        "[ESP32] Server error:",
        error.response.status,
        error.response.data,
      );
      throw new Error(
        error.response.data?.message ||
          `ESP32 server error: ${error.response.status}`,
      );
    } else if (error.request) {
      // Request made but no response received
      console.error("[ESP32] No response from ESP32");
      throw new Error(
        "ESP32 device not reachable. Please check device connection.",
      );
    } else {
      // Other error
      console.error("[ESP32] Request setup error:", error.message);
      throw new Error(error.message || "Failed to start NFC reading");
    }
  }
};

// Check NFC reading status from ESP32 - Direct HTTP API
export const checkESP32NFCStatus = async (esp32Url: string) => {
  try {
    console.log("[ESP32] Checking NFC status...");
    console.log("[ESP32] ESP32 URL:", esp32Url);

    const response = await axios.get(`${esp32Url}/api/nfc/status`, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "DASL-Mobile-App/1.0",
      },
    });

    console.log("[ESP32] Status response:", response.data);

    // Validate response structure
    if (response.data && response.data.success) {
      return response.data;
    } else {
      return {
        success: true,
        status: response.data.status || "unknown",
        message: response.data.message || "Status check completed",
        data: response.data.data || null,
      };
    }
  } catch (error: any) {
    console.error("[ESP32] Error checking ESP32 NFC status:", error);

    // Return fallback status for connection issues
    if (error.response) {
      console.error(
        "[ESP32] Server error:",
        error.response.status,
        error.response.data,
      );
      return {
        success: false,
        status: "error",
        message: error.response.data?.message || "ESP32 server error",
        data: null,
      };
    } else if (error.request) {
      console.error("[ESP32] No response from ESP32");
      return {
        success: false,
        status: "offline",
        message: "ESP32 device not reachable",
        data: null,
      };
    } else {
      console.error("[ESP32] Request setup error:", error.message);
      return {
        success: false,
        status: "error",
        message: error.message || "Failed to check NFC status",
        data: null,
      };
    }
  }
};

// Test ESP32 connectivity
export const testESP32Connection = async (esp32Url: string) => {
  try {
    console.log(`[ESP32] Testing connection to ${esp32Url}`);

    // Try to reach root endpoint first
    const response = await axios.get(`${esp32Url}/`, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("[ESP32] Root endpoint response:", response.data);
    return { success: true, reachable: true };
  } catch (error: any) {
    console.error("[ESP32] Connection test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      return {
        success: false,
        reachable: false,
        error: "Connection refused - device may be offline",
      };
    } else if (error.code === "ENOTFOUND") {
      return {
        success: false,
        reachable: false,
        error: "Host not found - check IP address",
      };
    } else if (error.code === "ETIMEDOUT") {
      return {
        success: false,
        reachable: false,
        error: "Connection timeout - device may be busy",
      };
    } else {
      return {
        success: false,
        reachable: false,
        error: error.message || "Unknown error",
      };
    }
  }
};

// Get ESP32 device info
export const getESP32DeviceInfo = async (esp32Url: string) => {
  try {
    const response = await axios.get(`${esp32Url}/api/device/info`, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("[ESP32] Device info response:", response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error("[ESP32] Device info request failed:", error.message);
    return {
      success: false,
      error: error.message || "Failed to get device info",
    };
  }
};

// Get ESP32 devices list
export const getESP32Devices = async () => {
  try {
    const response = await api.get("/api/devices");
    return response.data;
  } catch (error) {
    console.error("Error fetching ESP32 devices:", error);
    throw error;
  }
};

// Get latest attendance log for specific user
export const getLatestAttendanceForUser = async (username: string) => {
  try {
    const response = await api.get(`/api/attendance-logs`, {
      params: {
        username: username, // Use username instead of user_id
        limit: 1,
        sort: "check_time",
        order: "desc",
      },
      timeout: 10000, // Increased timeout
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const latestLog = response.data.data[0];

      // Check if this is a smartphone tap attendance (has device_uid)
      if (latestLog.device_uid && latestLog.status === "present") {
        return {
          success: true,
          data: {
            id: latestLog.id,
            username: latestLog.username || "", // Use username field
            name: latestLog.name || "", // Use name field
            deviceUID: latestLog.device_uid || "",
            deviceId: latestLog.device_info?.split("(")[1]?.split(")")[0] || "",
            deviceName:
              latestLog.device_name ||
              latestLog.device_info?.split("(")[0]?.trim() ||
              "",
            location: latestLog.location || "",
            // Use server time (check_time) instead of ESP32 timestamp
            timestamp: new Date(
              latestLog.check_time || latestLog.created_at,
            ).getTime(),
            checkInTime: latestLog.check_time, // Use check_time field from database
            createdAt: latestLog.created_at,
            status: latestLog.status,
          },
        };
      }
    }

    return {
      success: false,
      message: "No recent smartphone tap attendance found",
    };
  } catch (error) {
    console.error("Error getting latest attendance for user:", error);
    return { success: false, error: error };
  }
};

// Poll for new attendance for specific user (removed - using updated version below)

// Subscribe to attendance notifications via WebSocket (ESP32-Mobile) and API (Backend)
export const subscribeToAttendanceNotifications = (
  callback: (notification: any) => void,
) => {
  // WebSocket for ESP32-Mobile communication
  // API for Backend-View Logs communication

  const pollInterval = setInterval(async () => {
    try {
      // Poll API for attendance logs (View Logs data)
      const response = await api.get("/api/attendance-logs", {
        timeout: 5000,
      });

      if (response.data && response.data.data) {
        // Check for new attendance entries that could be notifications
        // Filter for entries with device_uid (smartphone taps have device_uid set)
        response.data.data.forEach((log: any) => {
          if (
            log.device_uid &&
            log.device_uid.length > 0 &&
            log.status === "present"
          ) {
            // Parse notification data from attendance log (View Logs)
            const notificationData = {
              type: "attendance_completed",
              data: {
                username: log.username || "", // Use username field
                name: log.name || "", // Use name field
                deviceUID: log.device_uid || "",
                deviceId: log.device_info?.split("(")[1]?.split(")")[0] || "",
                deviceName:
                  log.device_name ||
                  log.device_info?.split("(")[0]?.trim() ||
                  "",
                location: log.location || "",
                timestamp: new Date(
                  log.timestamp || log.check_in_time,
                ).getTime(),
                backendSaved: true, // Indicates this came from API (View Logs)
                source: "api", // Source identifier
              },
              timestamp: new Date(log.timestamp || log.check_in_time).getTime(),
            };

            callback(notificationData);
          }
        });
      }
    } catch (error) {
      console.error("Error polling attendance notifications from API:", error);
    }
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(pollInterval);
};

// ... (rest of the code remains the same)
// WebSocket notification handler for ESP32-Mobile communication
export const handleWebSocketNotification = (
  notification: any,
  callback: (notification: any) => void,
) => {
  console.log("[WS] Received WebSocket notification from ESP32:", notification);

  // WebSocket notifications come directly from ESP32
  if (notification.data && notification.data.backendSaved === true) {
    const notificationData = {
      type: "attendance_completed",
      data: {
        ...notification.data,
        source: "websocket", // Source identifier
      },
    };

    callback(notificationData);
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Get unread notifications
export const getUnreadNotifications = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/notifications/unread`, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    console.error("Error getting unread notifications:", error);
    throw error;
  }
};

// Send attendance notification to backend
export const sendAttendanceNotification = async (attendanceData: {
  username: string; // Use username instead of userId
  name: string; // Add name field
  deviceUID: string;
  deviceId: string;
  deviceName: string;
  location: string;
  timestamp: number;
}) => {
  try {
    const payload = {
      type: "attendance_completed",
      data: attendanceData,
      timestamp: Date.now(),
    };

    const response = await axios.post(
      `${BASE_URL}/api/notifications/attendance`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000,
      },
    );

    console.log("[Backend] Attendance notification sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending attendance notification:", error);
    throw error;
  }
};

// Poll user attendance from backend (updated version)
export const pollUserAttendance = async (username: string) => {
  try {
    console.log("Polling attendance for user:", username);
    const response = await api.get(`/api/attendance-logs`, {
      params: {
        username: username, // Use username instead of user_id
        limit: 1,
        sort: "check_time",
        order: "desc",
      },
      timeout: 10000,
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      const latestLog = response.data.data[0];
      return {
        success: true,
        data: {
          id: latestLog.id,
          username: latestLog.username || "", // Use username field
          name: latestLog.name || "", // Use name field
          deviceUID: latestLog.device_uid || "", // Use device_uid field directly
          deviceId: latestLog.device_info?.split("(")[1]?.split(")")[0] || "",
          deviceName:
            latestLog.device_name ||
            latestLog.device_info?.split("(")[0]?.trim() ||
            "",
          location: latestLog.location || "",
          timestamp: latestLog.timestamp
            ? isNaN(Number(latestLog.timestamp))
              ? new Date(latestLog.timestamp).getTime()
              : Number(latestLog.timestamp)
            : new Date(latestLog.check_time || latestLog.created_at).getTime(),
          checkTime: latestLog.check_time,
          createdAt: latestLog.created_at,
          date:
            latestLog.date ||
            new Date(
              latestLog.check_time || latestLog.created_at,
            ).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          status: latestLog.status,
        },
      };
    }

    return {
      success: false,
      data: null,
    };
  } catch (error: any) {
    console.error("Error polling user attendance:", error);
    return {
      success: false,
      error: error.message || "Failed to poll attendance",
      data: null,
    };
  }
};

// Approval API functions
export const getApprovals = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}) => {
  try {
    const response = await api.get("/api/approvals", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching approvals:", error);
    throw error;
  }
};

export const createApprovalRequest = async (approvalData: {
  type: string;
  title: string;
  description?: string;
  requested_by: string;
  request_data?: any;
}) => {
  try {
    const response = await api.post("/api/approvals", approvalData);
    return response.data;
  } catch (error) {
    console.error("Error creating approval request:", error);
    throw error;
  }
};

export const updateApprovalStatus = async (
  id: number,
  status: "approved" | "rejected",
  approved_by?: string,
  rejection_reason?: string,
) => {
  try {
    const response = await api.put(`/api/approvals/${id}/status`, {
      status,
      approved_by,
      rejection_reason,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating approval status:", error);
    throw error;
  }
};

export const getApprovalStats = async () => {
  try {
    const response = await api.get("/api/approvals/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching approval stats:", error);
    throw error;
  }
};

// Schedule Request API functions
export const getScheduleRequests = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  try {
    const response = await api.get("/api/schedule-requests", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching schedule requests:", error);
    throw error;
  }
};

export const createScheduleRequest = async (requestData: {
  course_id: number;
  course_name: string;
  course_code: string;
  start_time: string;
  end_time: string;
  room: string;
  requested_by: string;
  original_data?: any;
}) => {
  try {
    const response = await api.post("/api/schedule-requests", requestData);
    return response.data;
  } catch (error) {
    console.error("Error creating schedule request:", error);
    throw error;
  }
};

export const updateScheduleRequestStatus = async (
  id: number,
  status: "approved" | "rejected",
  approved_by?: string,
  rejection_reason?: string,
) => {
  try {
    const response = await api.put(`/api/schedule-requests/${id}/status`, {
      status,
      approved_by,
      rejection_reason,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating schedule request status:", error);
    throw error;
  }
};

export const getScheduleRequestStats = async () => {
  try {
    const response = await api.get("/api/schedule-requests/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching schedule request stats:", error);
    throw error;
  }
};

// Perwalian API functions
export const getPerwalianStatus = async () => {
  try {
    const response = await api.get("/api/perwalian/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching perwalian status:", error);
    // Return fallback data instead of throwing
    return {
      success: false,
      data: { status: false },
      message: "Failed to fetch perwalian status",
    };
  }
};

export const updatePerwalianStatus = async (status: boolean) => {
  try {
    const response = await api.put("/api/perwalian/status", {
      status,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating perwalian status:", error);
    throw error;
  }
};

// Perwalian Course API functions
export const getPerwalianCourses = async (userId?: number) => {
  try {
    const url = userId
      ? `/api/perwalian/courses?user_id=${userId}`
      : "/api/perwalian/courses";
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching perwalian courses:", error);
    throw error;
  }
};

export const createPerwalianCourse = async (data: {
  user_id: number;
  course_id: number;
}) => {
  try {
    const response = await api.post("/api/perwalian/courses", data);
    return response.data;
  } catch (error) {
    console.error("Error creating perwalian course:", error);
    throw error;
  }
};

export const updatePerwalianCourseStatus = async (
  id: number,
  status: string,
  data?: {
    approved_by?: number;
  },
) => {
  try {
    const response = await api.put(`/api/perwalian/courses/${id}/status`, {
      status,
      ...data,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating perwalian course status:", error);
    throw error;
  }
};

export const deletePerwalianCourse = async (id: number) => {
  try {
    const response = await api.delete(`/api/perwalian/courses/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting perwalian course:", error);
    throw error;
  }
};

// Chat API functions
export const ChatAPI = {
  getConversations: async (userId: number) => {
    try {
      const response = await api.get(`/api/chat/conversations/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
  },

  getMessages: async (conversationId: number, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/api/chat/messages/${conversationId}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  },

  createConversation: async (data: {
    title?: string;
    type: "direct" | "group";
    created_by: number;
    participant_ids: number[];
  }) => {
    try {
      const response = await api.post("/api/chat/conversations", data);
      return response.data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  },

  sendMessage: async (data: {
    conversation_id: number;
    sender_id: number;
    message: string;
    message_type?: "text" | "image" | "file";
    file_url?: string;
  }) => {
    try {
      const response = await api.post("/api/chat/messages", data);
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  markAsRead: async (data: { conversation_id: number; user_id: number }) => {
    try {
      const response = await api.post("/api/chat/read", data);
      return response.data;
    } catch (error) {
      console.error("Error marking as read:", error);
      throw error;
    }
  },

  deleteMessage: async (messageId: number, userId: number) => {
    try {
      const response = await api.delete(`/api/chat/messages/${messageId}`, {
        data: { user_id: userId },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  },

  editMessage: async (
    messageId: number,
    userId: number,
    newMessage: string,
  ) => {
    try {
      const response = await api.put(`/api/chat/messages/${messageId}`, {
        user_id: userId,
        message: newMessage,
      });
      return response.data;
    } catch (error) {
      console.error("Error editing message:", error);
      throw error;
    }
  },

  recallMessage: async (messageId: number, userId: number) => {
    try {
      const response = await api.post(
        `/api/chat/messages/${messageId}/recall`,
        {
          user_id: userId,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error recalling message:", error);
      throw error;
    }
  },

  getAvailableUsers: async (userId: number, role?: string, search?: string) => {
    try {
      const response = await api.get(`/api/chat/users/${userId}`, {
        params: { role, search },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching available users:", error);
      throw error;
    }
  },

  getParticipants: async (conversationId: number) => {
    try {
      const response = await api.get(
        `/api/chat/participants/${conversationId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching participants:", error);
      throw error;
    }
  },

  leaveConversation: async (conversationId: number, userId: number) => {
    try {
      const response = await api.delete(
        `/api/chat/participants/${conversationId}/${userId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error leaving conversation:", error);
      throw error;
    }
  },

  addParticipant: async (conversationId: number, userId: number) => {
    try {
      const response = await api.post(
        `/api/chat/participants/${conversationId}`,
        {
          user_id: userId,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error adding participant:", error);
      throw error;
    }
  },

  removeParticipant: async (conversationId: number, userId: number) => {
    try {
      const response = await api.delete(
        `/api/chat/participants/${conversationId}/${userId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error removing participant:", error);
      throw error;
    }
  },
};
