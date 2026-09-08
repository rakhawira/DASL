/**
 * Status utilities for consistent status styling across the app
 */

// Device status colors
export const getDeviceStatusColor = (status: string): string => {
  switch (status) {
    case "online":
      return "#10B981";
    case "offline":
      return "#EF4444";
    case "error":
      return "#F59E0B";
    case "in_use":
      return "#3B82F6";
    default:
      return "#6B7280";
  }
};

// Device status text
export const getDeviceStatusText = (
  status: string,
  language: "EN" | "ID" = "EN",
): string => {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "error":
      return "Error";
    case "in_use":
      return language === "EN" ? "In Use" : "Sedang Digunakan";
    default:
      return status;
  }
};

// Approval/Request status colors
export const getApprovalStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "#F59E0B";
    case "approved":
      return "#10B981";
    case "rejected":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

// Attendance log status colors
export const getAttendanceStatusColor = (
  status: string,
  isDarkMode: boolean,
): string => {
  switch (status) {
    case "present":
      return isDarkMode ? "bg-green-900" : "bg-green-100";
    case "late":
      return isDarkMode ? "bg-yellow-900" : "bg-yellow-100";
    case "absent":
      return isDarkMode ? "bg-red-900" : "bg-red-100";
    case "excused":
      return isDarkMode ? "bg-blue-900" : "bg-blue-100";
    default:
      return isDarkMode ? "bg-gray-700" : "bg-gray-100";
  }
};

// Attendance log status text colors
export const getAttendanceStatusTextColor = (status: string): string => {
  switch (status) {
    case "present":
      return "text-green-600";
    case "late":
      return "text-yellow-600";
    case "absent":
      return "text-red-600";
    case "excused":
      return "text-blue-600";
    default:
      return "text-gray-600";
  }
};

// Attendance status text
export const getAttendanceStatusText = (
  status: string,
  language: "EN" | "ID" = "EN",
): string => {
  switch (status) {
    case "present":
      return language === "EN" ? "Present" : "Hadir";
    case "late":
      return language === "EN" ? "Late" : "Terlambat";
    case "absent":
      return language === "EN" ? "Absent" : "Tidak Hadir";
    case "excused":
      return language === "EN" ? "Excused" : "Izin";
    default:
      return status;
  }
};

// Active/Inactive status colors (for courses, news, etc.)
export const getActiveStatusColor = (
  isActive: boolean,
  isDarkMode: boolean,
): string => {
  if (isActive) {
    return isDarkMode ? "bg-green-900" : "bg-green-100";
  }
  return isDarkMode ? "bg-gray-700" : "bg-gray-200";
};

// Active/Inactive status text colors
export const getActiveStatusTextColor = (isActive: boolean): string => {
  return isActive ? "text-green-600" : "text-gray-600";
};

// Generic boolean status text
export const getBooleanStatusText = (
  isActive: boolean,
  language: "EN" | "ID" = "EN",
): string => {
  if (isActive) {
    return language === "EN" ? "Active" : "Aktif";
  }
  return language === "EN" ? "Inactive" : "Nonaktif";
};
