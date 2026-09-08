export interface AttendanceLog {
  id: string;
  userId: string;
  username: string;
  name: string;
  jurusan: string;
  checkTime?: string; // Frontend preferred name
  check_time?: string; // Backend field name (snake_case)
  location: string;
  status: "present" | "late" | "absent";
  date: string; // Added date field for card display (DD MMM YYYY)
  created_at: string;
  updated_at: string;
  device_uid?: string; // NFC/smartphone UID
  device_name?: string; // Device name from devices table
  response_time?: string; // Response time for NFC/QR data transmission (e.g., "1.2s", "500ms")
}

export interface LogFilters {
  date_from?: string;
  date_to?: string;
  user_id?: string;
  status?: "present" | "late" | "absent";
  page?: number;
  limit?: number;
}

export interface LogStats {
  total: number;
  present: number;
  late: number;
  absent: number;
}

export interface SystemLog {
  id: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  context?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  created_at: string;
}

export interface SystemLogFilters {
  level?: "info" | "warning" | "error" | "debug";
  date_from?: string;
  date_to?: string;
  user_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}
