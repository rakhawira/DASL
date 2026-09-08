export interface Device {
  id: number;
  device_id: string;
  device_name: string;
  location: string;
  ip_address: string;
  mac_address: string;
  firmware_version: string;
  status: "online" | "offline" | "error" | "in_use";
  username?: string;
  name?: string;
  current_username?: string;
  current_user_id?: number;
  session_start?: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
  in_use: number;
}

export interface CreateDevice {
  device_id: string;
  device_name: string;
  location: string;
  ip_address: string;
  mac_address: string;
  firmware_version: string;
}

export interface UpdateDevice {
  device_name?: string;
  location?: string;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  status?: "online" | "offline" | "error" | "in_use";
}
