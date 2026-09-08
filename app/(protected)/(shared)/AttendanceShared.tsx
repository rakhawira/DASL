import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTimezone } from "@/hooks/useTimezone";
import {
  cancelNFCAttendance,
  getDevices,
  pollUserAttendance,
  submitNFCAttendance,
  triggerNFCAttendance,
} from "@/services/api";
import { NFCService } from "@/services/nfcService";
import { websocketService } from "@/services/websocketService";
import { Device } from "@/types/device";
import { getDeviceStatusColor, getDeviceStatusText } from "@/utils/statusUtils";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface AttendanceTabProps {
  user: any;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onBack?: () => void;
  onNavigateToLogs?: () => void;
  isPollingEnabled?: boolean; // Control polling from parent (default true)
  role?: "admin" | "lecturer" | "user"; // Role for navigation
}

function AttendanceShared({
  user,
  isDarkMode,
  language,
  showToast,
  onBack,
  onNavigateToLogs,
  isPollingEnabled = true, // Default to true for backward compatibility
  role = "user", // Default to user for backward compatibility
}: AttendanceTabProps) {
  const { timezoneInfo } = useTimezone();

  // State management
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorType, setErrorType] = useState<"general">("general");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<"nfc" | "qr">("nfc");
  const [isESP32Reading, setIsESP32Reading] = useState(false);
  const [isProcessingNFC, setIsProcessingNFC] = useState(false);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [lastDisplayedAttendanceId, setLastDisplayedAttendanceId] = useState<
    string | null
  >(null);
  const [lastDisplayedTime, setLastDisplayedTime] = useState<number>(0);

  // Track when NFC reading session started to filter out old data from polling
  const nfcSessionStartTime = React.useRef<number>(0);

  const router = useRouter();

  // Use ref for persistent tracking of displayed attendances across re-renders
  const displayedAttendanceIds = React.useRef<Set<string>>(new Set());
  const lastPollTime = React.useRef<number>(0);

  // Race condition prevention: Lock mechanism for attendance processing
  const attendanceLockRef = React.useRef<{
    processing: boolean;
    lastDeviceUID: string | null;
    lastTimestamp: number;
  }>({
    processing: false,
    lastDeviceUID: null,
    lastTimestamp: 0,
  });

  // Debounce mechanism for modal display to prevent duplicate modals
  const modalDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [lastDeviceStatus, setLastDeviceStatus] = useState<{
    [key: string]: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();

  // Truncate device UID for display
  const truncateDeviceUID = (uid: string) => {
    if (!uid) return "";
    if (uid.length <= 8) return uid;
    return uid.substring(0, 4) + "..." + uid.substring(uid.length - 4);
  };

  // Helper: Check and mark attendance as displayed (returns true if already displayed)
  const checkAndMarkAttendanceDisplayed = (
    deviceUID: string,
    attendanceId: string,
  ): boolean => {
    // Race condition guard: Check if another attendance is being processed
    if (attendanceLockRef.current.processing) {
      console.log("[RaceGuard] Another attendance being processed, skipping", {
        deviceUID,
        attendanceId,
      });
      return true;
    }

    const uniqueKey = `${deviceUID}_${attendanceId}`;
    if (displayedAttendanceIds.current.has(uniqueKey)) {
      return true; // Already displayed
    }

    // Additional guard: Check if same device UID within 5 seconds (prevent rapid duplicates)
    const now = Date.now();
    if (
      attendanceLockRef.current.lastDeviceUID === deviceUID &&
      now - attendanceLockRef.current.lastTimestamp < 5000
    ) {
      console.log("[RaceGuard] Same device UID within 5 seconds, skipping", {
        deviceUID,
        timeSinceLast: now - attendanceLockRef.current.lastTimestamp,
      });
      return true;
    }

    // Acquire lock and mark
    attendanceLockRef.current.processing = true;
    attendanceLockRef.current.lastDeviceUID = deviceUID;
    attendanceLockRef.current.lastTimestamp = now;
    displayedAttendanceIds.current.add(uniqueKey);
    setLastDisplayedAttendanceId(deviceUID);
    setLastDisplayedTime(now);

    // Release lock after 2 seconds (modal should be shown by then)
    setTimeout(() => {
      attendanceLockRef.current.processing = false;
    }, 2000);

    return false; // Not displayed before
  };

  // Helper: Check attendance ownership
  const isAttendanceForCurrentUser = (attendanceUsername: string): boolean => {
    const currentUsername = user?.username;
    if (attendanceUsername !== currentUsername) {
      console.log(
        "[Attendance] Attendance belongs to different user, skipping:",
        {
          attendanceUser: attendanceUsername,
          currentUser: currentUsername,
        },
      );
      return false;
    }
    return true;
  };

  // Helper: Set attendance result with consistent structure
  const setAttendanceResultData = (data: {
    username: string;
    name: string;
    deviceUID: string;
    deviceName: string;
    timestamp: string | number;
    location?: string;
    status?: string;
  }) => {
    setAttendanceResult({
      success: true,
      username: data.username,
      name: data.name,
      deviceId: truncateDeviceUID(data.deviceUID), // Truncated for display
      deviceUID: data.deviceUID, // Original UID from Arduino for modal display
      deviceName: data.deviceName,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp || new Date().toISOString(),
      location: data.location,
      status: data.status || "present",
    });
  };

  // Helper: Reset NFC-related states
  const resetNFCState = (options?: {
    keepDevice?: boolean;
    showToast?: boolean;
    toastMessage?: string;
    toastType?: "success" | "error" | "info";
    resetSession?: boolean; // Reset session time to prevent old data from showing
  }) => {
    const opts = options || {};

    setShowWaitingModal(false);
    setIsESP32Reading(false);
    setIsProcessingNFC(false);

    if (!opts.keepDevice) {
      setSelectedDevice(null);
    }

    // Reset session start time to prevent database polling from showing old data
    if (opts.resetSession !== false) {
      nfcSessionStartTime.current = 0;
      console.log("[NFC] Session start time reset");
    }

    // Stop NFC service
    NFCService.stop().catch(() => {});

    // Show toast if requested
    if (opts.showToast && opts.toastMessage) {
      showToast(opts.toastMessage, opts.toastType || "info");
    }
  };

  // Helper: Navigate to attendance success screen
  const navigateToAttendanceSuccess = (data: any) => {
    // Clear any pending modal debounce
    if (modalDebounceRef.current) {
      clearTimeout(modalDebounceRef.current);
      modalDebounceRef.current = null;
    }

    // Release attendance lock
    attendanceLockRef.current.processing = false;

    // Navigate to success screen with attendance data
    const resultPath =
      role === "admin"
        ? "/(protected)/admin/pages/AttendanceResultPage"
        : role === "lecturer"
          ? "/(protected)/lecturer/pages/AttendanceResultPage"
          : "/(protected)/user/pages/AttendanceResultPage";

    router.push({
      pathname: resultPath as any,
      params: {
        username: data.username,
        name: data.name,
        deviceId: data.deviceId || data.deviceUID, // Support both field names
        deviceName: data.deviceName,
        timestamp: data.timestamp,
        location: data.location || "",
        status: data.status || "present",
      },
    });

    // Reset states after navigation
    setAttendanceResult(null);
    setLastDisplayedAttendanceId(null);
    setLastDisplayedTime(0);
  };

  // Helper: Navigate to attendance success screen with debounce to prevent duplicates
  const navigateToAttendanceSuccessWithDebounce = (data: any) => {
    // Clear any pending debounce
    if (modalDebounceRef.current) {
      clearTimeout(modalDebounceRef.current);
    }

    // Debounce 150ms - take the last one if multiple calls happen rapidly
    modalDebounceRef.current = setTimeout(() => {
      setAttendanceResultData(data);
      navigateToAttendanceSuccess(data);
      modalDebounceRef.current = null;
    }, 150);
  };

  // Handle QR code scan success
  const handleQRScanSuccess = (qrData: string) => {
    try {
      const parsedData = JSON.parse(qrData);
      console.log("[QR Scanner] QR data parsed:", parsedData);

      // Validate QR data contains required fields
      if (
        !parsedData.deviceId ||
        !parsedData.username ||
        !parsedData.timestamp
      ) {
        showToast(
          language === "EN"
            ? "Invalid QR code format"
            : "Format QR code tidak valid",
          "error",
        );
        return;
      }

      // Find the device in our device list
      const device = devices.find((d) => d.device_id === parsedData.deviceId);
      if (!device) {
        showToast(
          language === "EN"
            ? "Device not found or not available"
            : "Perangkat tidak ditemukan atau tidak tersedia",
          "error",
        );
        return;
      }

      // Check if device is available
      if (device.status === "offline") {
        showToast(
          language === "EN" ? "Device is offline" : "Perangkat sedang offline",
          "error",
        );
        return;
      }

      if (device.status === "in_use" && device.username !== user?.username) {
        showToast(
          language === "EN"
            ? `Device is being used by ${device.username || "another user"}`
            : `Perangkat sedang digunakan oleh ${device.username || "pengguna lain"}`,
          "error",
        );
        return;
      }

      showToast(
        language === "EN"
          ? "Attendance marked successfully via QR code!"
          : "Absensi berhasil ditandai melalui QR code!",
        "success",
      );

      // Refresh devices list
      fetchOnlineDevices();
    } catch (error) {
      console.error("[QR Scanner] Error processing QR data:", error);
      showToast(
        language === "EN"
          ? "Failed to process QR code. Please try again."
          : "Gagal memproses QR code. Silakan coba lagi.",
        "error",
      );
    }
  };

  // Navigate to QR scanner page with selected device
  const navigateToQRScanner = (device: Device) => {
    router.push({
      pathname: "/(protected)/admin/pages/QRScannerPage" as any,
      params: {
        deviceId: device.device_id,
        deviceName: device.device_name || "",
        deviceLocation: device.location || "",
        deviceStatus: device.status,
        deviceIp: device.ip_address || "",
        deviceMac: device.mac_address || "",
        deviceFirmware: device.firmware_version || "",
      },
    });
  };

  // Filter devices based on search query and status - show online and in_use devices
  const filteredDevices = devices.filter((device: Device) => {
    // Include online and in_use devices (exclude offline only)
    if (device.status === "offline") {
      return false;
    }

    // If no search query, show all non-offline devices
    if (!searchQuery.trim()) return true;

    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    return (
      device.device_name?.toLowerCase().includes(searchLower) ||
      device.device_id?.toLowerCase().includes(searchLower) ||
      device.location?.toLowerCase().includes(searchLower) ||
      device.ip_address?.toLowerCase().includes(searchLower) ||
      device.mac_address?.toLowerCase().includes(searchLower)
    );
  });

  // Fetch online devices
  const fetchOnlineDevices = async () => {
    try {
      setLoadingDevices(true);
      const response = await getDevices();

      if (response.success) {
        setDevices(response.data?.devices || []); // Access via data.devices
      } else {
        showToast(
          language === "EN"
            ? "Failed to load devices"
            : "Gagal memuat perangkat",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error fetching devices:", error);
      // Check for network error
      if (
        error.code === "NETWORK_ERROR" ||
        error.code === "ECONNABORTED" ||
        !error.response
      ) {
        showToast(
          language === "EN"
            ? "Network error. Please check your internet connection."
            : "Error jaringan. Silakan periksa koneksi internet Anda.",
          "error",
        );
      } else {
        showToast(
          language === "EN"
            ? "Failed to load devices"
            : "Gagal memuat perangkat",
          "error",
        );
      }
    } finally {
      setLoadingDevices(false);
    }
  };

  // Handle WebSocket-based NFC reading with HTTP API fallback and smartphone NFC activation
  const handleWebSocketNFCReading = async (device: Device) => {
    try {
      // Check if device is already in use by another user
      if (device.status === "in_use" && device.username !== user?.username) {
        showToast(
          language === "EN"
            ? `Device is being used by ${device.username || "another user"}`
            : `Perangkat sedang digunakan oleh ${device.username || "pengguna lain"}`,
          "error",
        );
        return;
      }

      setIsESP32Reading(true);
      setIsProcessingNFC(true);
      setSelectedDevice(device);
      setShowWaitingModal(true);

      // Set session start time for this NFC reading
      nfcSessionStartTime.current = Date.now();
      console.log(
        `[NFC] Session started at: ${new Date(nfcSessionStartTime.current).toISOString()}`,
      );

      // Clear the persistent ref tracking to allow new attendance from same device
      displayedAttendanceIds.current.clear();
      console.log(
        "[NFC] Cleared displayed attendance tracking for new session",
      );

      console.log(`[NFC] Starting NFC reading for device: ${device.device_id}`);
      console.log(`[NFC] User: ${user?.username} (${user?.name})`);

      // Start smartphone NFC reading first - ONLY when triggered
      let smartphoneNFCActive = false;
      try {
        console.log("[Smartphone] Activating NFC reading...");

        // Check NFC support and permissions
        const { supported, enabled, permissionGranted } =
          await NFCService.checkNFCPermissions();

        if (!supported) {
          showToast(
            language === "EN"
              ? "Your device does not support NFC"
              : "Perangkat Anda tidak mendukung NFC",
            "error",
          );
        } else if (!enabled) {
          showToast(
            language === "EN"
              ? "Please enable NFC in your device settings"
              : "Silakan aktifkan NFC di pengaturan perangkat Anda",
            "error",
          );
        } else if (!permissionGranted) {
          showToast(
            language === "EN"
              ? "NFC permission is required. Please grant permission when prompted."
              : "Izin NFC diperlukan. Silakan berikan izin saat diminta.",
            "error",
          );
        } else {
          // Start NFC reading in background - ONLY when user triggers NFC
          NFCService.readNDEF()
            .then((nfcData) => {
              if (nfcData && isESP32Reading && isProcessingNFC) {
                console.log(
                  "[Smartphone] NFC data read successfully:",
                  nfcData,
                );

                // Process the NFC data from ESP32
                handleSmartphoneNFCData(nfcData, device);
              } else if (nfcData) {
                console.log(
                  "[Smartphone] NFC read but not in active state - ignoring",
                );
              }
            })
            .catch((error) => {
              console.warn("[Smartphone] NFC reading failed:", error);
              // Don't show error here as ESP32 might still work
            });

          smartphoneNFCActive = true;
          console.log("[Smartphone] NFC reading activated");
        }
      } catch (nfcError) {
        console.warn("[Smartphone] Failed to activate NFC:", nfcError);
        // Continue with ESP32 trigger even if smartphone NFC fails
      }

      // Ensure WebSocket is connected before NFC trigger
      console.log(
        "[WebSocket] Checking connection status:",
        websocketService.isConnected(),
      );
      if (!websocketService.isConnected()) {
        console.log("[WebSocket] Not connected, attempting to connect...");
        try {
          await websocketService.connect();
          console.log("[WebSocket] Connected successfully");
        } catch (connectError) {
          console.warn("[WebSocket] Failed to connect:", connectError);
        }
      }

      // Try WebSocket first for real-time communication
      let websocketSuccess = false;
      if (websocketService.isConnected()) {
        try {
          console.log(
            "[WebSocket] Sending NFC trigger for device:",
            device.device_id,
          );
          const success = websocketService.triggerNFCAttendance(device, user);
          if (success) {
            websocketSuccess = true;
            console.log("[WebSocket] NFC trigger sent successfully");
          } else {
            console.warn("[WebSocket] NFC trigger returned false");
          }
        } catch (wsError) {
          console.warn("[WebSocket] Failed to send NFC trigger:", wsError);
        }
      } else {
        console.warn("[WebSocket] Still not connected, will use HTTP only");
      }

      // Also try HTTP API as backup and to ensure database is updated
      try {
        const apiResponse = await triggerNFCAttendance(
          device.device_id,
          user?.username, // Username (NIM)
          user?.name, // Full name
        );

        if (apiResponse.success) {
          console.log("[HTTP API] NFC trigger successful");

          // Update device status from API response (HTTPS-based update)
          if (apiResponse.device) {
            setDevices((prevDevices) =>
              prevDevices.map((device) =>
                device.device_id === apiResponse.device.device_id
                  ? { ...device, ...apiResponse.device }
                  : device,
              ),
            );
            console.log(
              "[HTTP API] Device status updated from API response:",
              apiResponse.device,
            );
          }

          // If WebSocket failed, we can still proceed with HTTP
          if (!websocketSuccess) {
            showToast(
              language === "EN"
                ? "NFC reading started. Please tap your smartphone on the device."
                : "Pembacaan NFC dimulai. Silakan ketuk smartphone Anda pada perangkat.",
              "info",
            );
          }
        } else {
          throw new Error(apiResponse.message || "HTTP API failed");
        }
      } catch (apiError) {
        console.error("[HTTP API] Error triggering NFC:", apiError);

        // If both WebSocket and HTTP failed, show error
        if (!websocketSuccess) {
          throw new Error("Both WebSocket and HTTP API failed");
        }
      }

      // Show appropriate success message based on what was activated
      if (websocketSuccess && smartphoneNFCActive) {
        showToast(
          language === "EN"
            ? "NFC reading started. Both ESP32 and smartphone NFC are active."
            : "Pembacaan NFC dimulai. NFC ESP32 dan smartphone aktif.",
          "info",
        );
      } else if (websocketSuccess) {
        showToast(
          language === "EN"
            ? "NFC reading started. Please tap your smartphone on the device."
            : "Pembacaan NFC dimulai. Silakan ketuk smartphone Anda pada perangkat.",
          "info",
        );
      } else if (smartphoneNFCActive) {
        showToast(
          language === "EN"
            ? "Smartphone NFC activated. Please tap the ESP32 device."
            : "NFC smartphone diaktifkan. Silakan ketuk perangkat ESP32.",
          "info",
        );
      }

      // Refresh devices to show updated status
      fetchOnlineDevices();
    } catch (error) {
      console.error("Error in NFC reading:", error);
      resetNFCState({
        showToast: true,
        toastMessage:
          language === "EN"
            ? "Failed to start NFC reading. Please try again."
            : "Gagal memulai pembacaan NFC. Silakan coba lagi.",
        toastType: "error",
      });
    }
  };

  // Handle NFC data read from smartphone
  const handleSmartphoneNFCData = async (nfcData: any, device: Device) => {
    try {
      console.log("[Smartphone] Processing NFC data:", nfcData);

      // Extract device UID from NFC data
      const deviceUID =
        nfcData.id || nfcData.records?.[0]?.payload || "unknown";

      // Check and mark attendance as displayed
      const attendanceId = Date.now().toString();
      if (checkAndMarkAttendanceDisplayed(deviceUID, attendanceId)) {
        console.log("[Smartphone] Attendance already displayed, skipping");
        return;
      }

      // Submit NFC attendance to backend API directly (like QR mode)
      showToast(
        language === "EN" ? "Submitting attendance..." : "Mengirim absensi...",
        "info",
      );

      const response = await submitNFCAttendance({
        device_id: device.device_id,
        nfc_data: deviceUID,
        username: user?.username,
        name: user?.name || user?.username,
        timestamp: Date.now(),
      });

      if (response.success && response.data) {
        // Close waiting modal and reset states
        resetNFCState({ keepDevice: true });

        // Navigate to success screen with attendance data from backend (like QR mode)
        const attendance = response.data.attendance || response.data;
        navigateToAttendanceSuccessWithDebounce({
          username: attendance.username || user?.username,
          name: attendance.name || user?.name || user?.username,
          deviceUID: attendance.device_uid || deviceUID,
          deviceName: attendance.deviceName || device.device_name,
          timestamp:
            attendance.check_time ||
            attendance.timestamp ||
            new Date().toISOString(),
          location: attendance.location || device.location,
          status: attendance.status || "present",
        });

        showToast(
          language === "EN"
            ? "Attendance marked successfully!"
            : "Absensi berhasil ditandai!",
          "success",
        );

        // Refresh devices list
        fetchOnlineDevices();
      } else {
        throw new Error(response.message || "Failed to mark attendance");
      }
    } catch (error: any) {
      console.error("[Smartphone] Error processing NFC data:", error);
      resetNFCState({
        showToast: true,
        toastMessage:
          error.message ||
          (language === "EN"
            ? "Failed to process NFC data. Please try again."
            : "Gagal memproses data NFC. Silakan coba lagi."),
        toastType: "error",
      });
    }
  };

  // Track screen focus state using useFocusEffect
  const isScreenFocusedRef = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      isScreenFocusedRef.current = true;
      console.log("[AttendanceTab] Screen focused - WebSocket can connect");
      return () => {
        isScreenFocusedRef.current = false;
        console.log(
          "[AttendanceTab] Screen unfocused - WebSocket should disconnect",
        );
        // Force disconnect WebSocket when leaving attendance page
        websocketService.disconnect();
      };
    }, []),
  );

  // Setup WebSocket handlers - Only for NFC trigger and attendance results
  // Only connect WebSocket when screen is focused and polling is enabled
  useEffect(() => {
    if (!isPollingEnabled || !isScreenFocusedRef.current) return; // Don't connect WebSocket if not focused or disabled

    // WebSocket only used for NFC trigger communication and attendance results
    // Device status updates handled by HTTPS API polling

    // Handle attendance results
    websocketService.onMessage("attendance_result", (message: any) => {
      console.log("[AttendanceTab] Attendance result received:", message);

      // Close waiting modal and reset states
      resetNFCState();

      if (message.success && message.attendanceData) {
        // ONLY show modal if this attendance belongs to current user
        if (!isAttendanceForCurrentUser(message.attendanceData.username)) {
          return;
        }

        const deviceUID = message.attendanceData.deviceUID || "";
        const attendanceId = message.attendanceData.id?.toString() || "";

        // Check if this attendance was already displayed
        if (checkAndMarkAttendanceDisplayed(deviceUID, attendanceId)) {
          console.log("[WebSocket] Attendance already displayed, skipping");
          return;
        }

        // Navigate to success screen (with debounce for race condition prevention)
        navigateToAttendanceSuccessWithDebounce({
          username: message.attendanceData.username,
          name: message.attendanceData.name,
          deviceUID,
          deviceName: message.attendanceData.deviceName,
          timestamp:
            message.attendanceData.checkTime ||
            message.attendanceData.timestamp,
          location: message.attendanceData.location,
          status: message.attendanceData.status || "present",
        });

        showToast(
          language === "EN"
            ? "Attendance marked successfully!"
            : "Absensi berhasil ditandai!",
          "success",
        );

        // Refresh devices list
        fetchOnlineDevices();
      } else {
        // Handle attendance failure
        setErrorType("general");
        setErrorMessage(
          message && message.error
            ? message.error
            : "Failed to mark attendance. Please try again.",
        );
        setShowErrorModal(true);
      }
    });

    // Handle NFC timeout
    websocketService.onMessage("nfc_timeout", (message: any) => {
      console.log("[AttendanceTab] NFC timeout:", message);

      // ONLY show notification if this timeout belongs to current user
      if (
        message.data?.username &&
        !isAttendanceForCurrentUser(message.data.username)
      ) {
        console.log("[NFC Timeout] Not for current user, skipping:", {
          timeoutUser: message.data.username,
          currentUser: user?.username,
        });
        return;
      }

      resetNFCState({
        showToast: true,
        toastMessage:
          language === "EN"
            ? "NFC reading timed out. No card was tapped."
            : "Pembacaan NFC timeout. Tidak ada kartu yang diketuk.",
        toastType: "error",
      });

      // Refresh devices list
      fetchOnlineDevices();
    });

    // Handle NFC error
    websocketService.onMessage("nfc_error", (message: any) => {
      console.log("[AttendanceTab] NFC error:", message);

      resetNFCState({
        showToast: true,
        toastMessage:
          language === "EN"
            ? message.message || "NFC reading failed. Please try again."
            : message.message || "Pembacaan NFC gagal. Silakan coba lagi.",
        toastType: "error",
      });

      // Refresh devices list
      fetchOnlineDevices();
    });

    // Connect to WebSocket
    websocketService.connect().catch((error: any) => {
      console.error("[AttendanceTab] Failed to connect to WebSocket:", error);
    });

    return () => {
      // Cleanup WebSocket handlers (only for attendance results and NFC events)
      websocketService.offMessage("attendance_result");
      websocketService.offMessage("nfc_timeout");
      websocketService.offMessage("nfc_error");
      // Disconnect WebSocket when leaving attendance page
      websocketService.disconnect();
    };
  }, [language, showToast, isPollingEnabled]);

  // Track if polling should be active (set via effect)
  const isPollingActiveRef = useRef(true);

  // Handle AppState changes to pause/resume polling when app is backgrounded
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        isPollingActiveRef.current = true;
      } else {
        isPollingActiveRef.current = false;
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Setup database polling for attendance logs (stops when component unmounts or disabled)
  useEffect(() => {
    if (!user?.username || !isPollingEnabled) return; // Don't start polling if disabled

    console.log("[API] Starting attendance polling for user:", user.username);

    // Don't reset displayedAttendanceIds here - keep it persistent
    // Only reset if user actually changes (handled by separate logic if needed)

    const pollAttendance = async () => {
      // Skip polling if not active (app in background)
      if (!isPollingActiveRef.current) {
        return;
      }

      try {
        const result = await pollUserAttendance(user.username);

        if (result.success && result.data) {
          const deviceUID = result.data.deviceUID || "";
          const attendanceId = result.data.id?.toString() || "";

          // Check if this attendance was already displayed
          if (checkAndMarkAttendanceDisplayed(deviceUID, attendanceId)) {
            console.log("[API] Attendance already displayed, skipping");
            return;
          }

          // Check if attendance is very recent (within 30 seconds)
          const attendanceTime = result.data.timestamp || 0;
          const currentTime = Date.now();
          const isRecentAttendance = currentTime - attendanceTime < 30000;

          // CRITICAL: Only show attendance if it was recorded AFTER this NFC session started
          // This prevents showing old data from previous sessions
          const isAfterSessionStart =
            nfcSessionStartTime.current > 0 &&
            attendanceTime >= nfcSessionStartTime.current;

          // ONLY show modal if:
          // 1. Attendance is very recent (within 30s), AND
          // 2. Attendance timestamp is AFTER this NFC session started
          const isUserInNFCProcess = isESP32Reading || isProcessingNFC;

          if (!isUserInNFCProcess && !isRecentAttendance) {
            console.log("[API] Skipping attendance - not in process and old");
            return;
          }

          if (!isAfterSessionStart) {
            console.log(
              "[API] Skipping attendance - recorded before this session started",
              {
                attendanceTime: new Date(attendanceTime).toISOString(),
                sessionStart: new Date(
                  nfcSessionStartTime.current,
                ).toISOString(),
              },
            );
            return;
          }

          console.log("[API] Found new attendance from database:", result.data);

          console.log(
            "[AttendanceTab] Database Poll: Closing waiting modal and showing attendance modal",
          );
          resetNFCState();

          // Navigate to success screen from database data (with debounce for race condition prevention)
          navigateToAttendanceSuccessWithDebounce({
            username: result.data.username,
            name: result.data.name,
            deviceUID: result.data.deviceUID,
            deviceName: result.data.deviceName,
            timestamp:
              result.data.checkTime ||
              result.data.timestamp ||
              new Date().toISOString(),
            location: result.data.location,
            status: result.data.status || "present",
          });

          showToast(
            language === "EN"
              ? "Attendance recorded successfully!"
              : "Absensi berhasil dicatat!",
            "success",
          );

          fetchOnlineDevices();
        }
      } catch (error) {
        console.error("[API] Error polling attendance:", error);
      }
    };

    const interval = setInterval(pollAttendance, 2000); // Poll every 2 seconds

    // Also poll device status every 3 seconds using HTTPS API
    const pollDeviceStatus = async () => {
      try {
        const devicesResponse = await getDevices();
        if (devicesResponse.success && devicesResponse.data?.devices) {
          // ✅ Use correct structure
          // Update local devices state with latest data from API
          setDevices((prevDevices) => {
            const updatedDevices = prevDevices.map((localDevice) => {
              const apiDevice = devicesResponse.data.devices.find(
                (d: any) => d.device_id === localDevice.device_id,
              );
              return apiDevice ? { ...localDevice, ...apiDevice } : localDevice;
            });

            // Check if selected device became unlocked (status changed from locked to online)
            if (selectedDevice && isProcessingNFC && showWaitingModal) {
              const updatedDevice = updatedDevices.find(
                (d) => d.device_id === selectedDevice.device_id,
              );

              // If device was locked but now is online (unlocked), close waiting modal
              if (updatedDevice && updatedDevice.status === "online") {
                console.log(
                  "[Device Status] Device became unlocked, closing waiting modal",
                  {
                    deviceId: updatedDevice.device_id,
                    previousStatus: selectedDevice.status,
                    currentStatus: updatedDevice.status,
                  },
                );
                resetNFCState({
                  showToast: true,
                  toastMessage:
                    language === "EN"
                      ? "Device unlocked. NFC reading cancelled."
                      : "Perangkat terbuka. Pembacaan NFC dibatalkan.",
                  toastType: "info",
                });
              }
            }

            return updatedDevices;
          });
        }
      } catch (error) {
        console.error("[API] Error polling device status:", error);
      }
    };

    const deviceStatusInterval = setInterval(pollDeviceStatus, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
      clearInterval(deviceStatusInterval);
    };
  }, [
    user,
    language,
    showToast,
    isESP32Reading,
    isProcessingNFC,
    selectedDevice,
    showWaitingModal,
    displayedAttendanceIds,
    resetNFCState,
    setAttendanceResult,
    setLastDisplayedAttendanceId,
    setLastDisplayedTime,
    fetchOnlineDevices,
    showToast,
    setDevices,
    isPollingEnabled,
  ]);

  // Register refresh function
  useEffect(() => {
    registerRefreshFunction("fetchOnlineDevices", fetchOnlineDevices);

    return () => {
      unregisterRefreshFunction("fetchOnlineDevices");
    };
  }, [language]);

  // Initial load
  useEffect(() => {
    fetchOnlineDevices();
  }, []);

  // Check NFC support
  useEffect(() => {
    const checkNFCSupport = async () => {
      try {
        const supported = await NFCService.isNFCSupported();
        setIsNfcSupported(supported);
      } catch (error) {
        console.error("Error checking NFC support:", error);
        setIsNfcSupported(false);
      }
    };

    checkNFCSupport();
  }, []);

  // Helper function to safely parse and format time
  const safeFormatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return new Date().toLocaleString();

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleString();
      }

      // Convert timezone abbreviation to IANA format
      const tz = timezoneInfo.timezone.toLowerCase();
      let timeZone = timezoneInfo.timezone;
      if (tz === "wib") timeZone = "Asia/Jakarta";
      else if (tz === "wita") timeZone = "Asia/Makassar";
      else if (tz === "wit") timeZone = "Asia/Jayapura";

      return date.toLocaleString(language === "EN" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: language === "EN",
        timeZone: timeZone,
      });
    } catch (error) {
      return new Date().toLocaleString();
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOnlineDevices();
    setRefreshing(false);
    showToast(
      language === "EN"
        ? "Data refreshed successfully"
        : "Data berhasil diperbarui",
      "success",
    );
  };

  // Device card component - Based on ManageDevicesPage design
  const DeviceCard = ({ device }: { device: Device }) => (
    <View
      className={`rounded-xl mb-4 overflow-hidden ${
        device.status === ("in_use" as any)
          ? isDarkMode
            ? "bg-gray-900 border-2 border-orange-800 opacity-75"
            : "bg-gray-100 border-2 border-orange-300 opacity-75"
          : isDarkMode
            ? "bg-gray-800"
            : "bg-white"
      } shadow-md`}
    >
      {/* Protection layer for in-use devices - Full cover */}
      {device.status === ("in_use" as any) && (
        <View
          className={`absolute inset-0 z-10 ${
            isDarkMode ? "bg-black/60" : "bg-gray-900/40"
          } justify-center items-center`}
          style={{
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <View
            className={`mx-4 p-4 rounded-xl max-w-[200px] ${
              isDarkMode ? "bg-orange-900/95" : "bg-orange-100/98"
            }`}
          >
            <View className="items-center mb-2">
              <MaterialCommunityIcons
                name="lock"
                size={28}
                color={getDeviceStatusColor(device.status)}
              />
            </View>
            <Text
              className={`text-center font-medium text-sm ${
                isDarkMode ? "text-orange-200" : "text-orange-800"
              }`}
            >
              {language === "EN"
                ? "Device in use"
                : "Perangkat sedang digunakan"}
            </Text>
            {device.current_username && (
              <Text
                className={`text-center text-xs mt-1 ${
                  isDarkMode ? "text-orange-300" : "text-orange-700"
                }`}
                numberOfLines={1}
              >
                {language === "EN"
                  ? `By: ${device.current_username}`
                  : `Oleh: ${device.current_username}`}
              </Text>
            )}
            <Text
              className={`text-center text-[10px] mt-1 ${
                isDarkMode ? "text-orange-400" : "text-orange-600"
              }`}
            >
              {language === "EN"
                ? "Please wait until available"
                : "Silakan tunggu hingga tersedia"}
            </Text>
          </View>
        </View>
      )}

      {/* Card Content */}
      <View className="p-4">
        {/* Header with device name and status badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1 pr-2">
            <Text
              className={`font-bold text-lg ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
              numberOfLines={1}
            >
              {device.device_name || device.device_id}
            </Text>
          </View>
          <View
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: getDeviceStatusColor(device.status) + "20",
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: getDeviceStatusColor(device.status) }}
            >
              {getDeviceStatusText(device.status, language)}
            </Text>
          </View>
        </View>

        {/* Device information with icons */}
        <View className="space-y-2 mb-4">
          {device.location && (
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`ml-2 text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
                numberOfLines={1}
              >
                {device.location}
              </Text>
            </View>
          )}
        </View>

        {/* Action buttons for available devices */}
        {device.status !== ("in_use" as any) && (
          <View className="flex-row gap-2">
            {/* NFC button - only show if device supports NFC */}
            {isNfcSupported && (
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg flex-row items-center justify-center ${
                  attendanceMode === "nfc" || isESP32Reading || isProcessingNFC
                    ? "bg-red-500"
                    : isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-200"
                }`}
                onPress={() => handleWebSocketNFCReading(device)}
                disabled={isESP32Reading || isProcessingNFC}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="cellphone-nfc"
                  size={16}
                  color={
                    attendanceMode === "nfc" ||
                    isESP32Reading ||
                    isProcessingNFC
                      ? "white"
                      : isDarkMode
                        ? "#9CA3AF"
                        : "#4B5563"
                  }
                />
                <Text
                  className={`ml-1 text-sm font-medium ${
                    attendanceMode === "nfc" ||
                    isESP32Reading ||
                    isProcessingNFC
                      ? "text-white"
                      : isDarkMode
                        ? "#9CA3AF"
                        : "#4B5563"
                  }`}
                >
                  {language === "EN" ? "Start NFC" : "Mulai NFC"}
                </Text>
              </TouchableOpacity>
            )}

            {/* QR Scanner button - always show */}
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg flex-row items-center justify-center ${
                isDarkMode ? "bg-green-600" : "bg-green-500"
              }`}
              onPress={() => navigateToQRScanner(device)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={16}
                color="white"
              />
              <Text className={`ml-1 text-sm font-medium text-white`}>
                {language === "EN" ? "QR Scanner" : "Pemindai QR"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={language === "EN" ? "Attendance" : "Absensi"}
          subtitle={
            language === "EN" ? "Mark your attendance" : "Tandai kehadiran Anda"
          }
          isDarkMode={isDarkMode}
          onBack={onBack}
        />

        {/* Search Bar */}
        <View className="px-6 py-3">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search devices by name or ID..."
            placeholderID="Cari perangkat berdasarkan nama atau ID..."
            isDarkMode={isDarkMode}
            language={language}
            containerStyle={{
              backgroundColor: isDarkMode ? "#1F2937" : "#F3F4F6",
            }}
          />
        </View>

        {/* Device List */}
        <View className="px-6 flex-1">
          {loadingDevices ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#60A5FA" : "#3B82F6"}
                className="mb-4"
              />
              <Text
                className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {language === "EN"
                  ? "Loading devices..."
                  : "Memuat perangkat..."}
              </Text>
            </View>
          ) : filteredDevices.length === 0 ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
            >
              <EmptyState
                icon="hardware-chip-outline"
                iconSize={40}
                titleEN="No Available Devices"
                titleID="Tidak Ada Perangkat"
                subtitleEN={
                  searchQuery.trim()
                    ? `No devices found for "${searchQuery}"`
                    : "No devices are currently online. Please check your connection and try again."
                }
                subtitleID={
                  searchQuery.trim()
                    ? `Tidak ada perangkat untuk "${searchQuery}"`
                    : "Tidak ada perangkat ESP32 yang online. Silakan periksa koneksi Anda dan coba lagi."
                }
                isDarkMode={isDarkMode}
                language={language}
                containerStyle={{
                  paddingVertical: 80,
                  paddingHorizontal: 32,
                }}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={filteredDevices}
              renderItem={({ item }) => <DeviceCard device={item} />}
              keyExtractor={(item) => item.device_id}
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Waiting Modal */}
        <Modal
          visible={showWaitingModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            // Allow cancel when reading is active
            resetNFCState();
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              className={`w-80 p-6 rounded-xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <View className="mb-4">
                <ActivityIndicator
                  size="large"
                  color="#3B82F6"
                  className="animate-pulse"
                />
              </View>
              <Text
                className={`text-lg font-bold mb-2 text-center ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN" ? "Reading NFC..." : "Membaca NFC..."}
              </Text>
              <Text
                className={`text-center mb-4 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {language === "EN"
                  ? "Activating NFC on both device and smartphone. Please tap when ready."
                  : "Mengaktifkan NFC pada perangkat dan smartphone. Silakan ketuk saat siap."}
              </Text>

              {selectedDevice && (
                <View
                  className={`p-3 rounded-lg mb-4 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Device:" : "Perangkat:"}
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {selectedDevice.device_name || selectedDevice.device_id}
                  </Text>
                  {selectedDevice.location && (
                    <Text
                      className={`text-xs mt-1 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {selectedDevice.location}
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                className={`py-2 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
                disabled={isESP32Reading || isProcessingNFC}
                onPress={async () => {
                  try {
                    if (selectedDevice) {
                      // Cancel NFC attendance and cleanup
                      await cancelNFCAttendance(
                        selectedDevice.device_id,
                        user?.username || "",
                      );

                      // Stop any active NFC reading
                      try {
                        await NFCService.stop();
                      } catch (stopError) {
                        console.warn(
                          "[NFC] Error stopping NFC service:",
                          stopError,
                        );
                      }

                      resetNFCState();

                      showToast(
                        language === "EN"
                          ? "NFC attendance cancelled"
                          : "Absensi dibatalkan",
                        "info",
                      );

                      // Refresh devices list
                      fetchOnlineDevices();
                    }
                  } catch (error) {
                    console.error("Error cancelling NFC attendance:", error);
                    showToast(
                      language === "EN"
                        ? "Failed to cancel attendance"
                        : "Gagal membatalkan absensi",
                      "error",
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-center font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  } ${isESP32Reading || isProcessingNFC ? "opacity-50" : ""}`}
                >
                  {language === "EN" ? "Cancel" : "Batal"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Error Modal */}
        {showErrorModal && (
          <Modal
            visible={showErrorModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowErrorModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50">
              <View
                className={`w-80 p-6 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="mb-4">
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={48}
                    color={errorType === "general" ? "#EF4444" : "#6B7280"}
                  />
                </View>
                <Text
                  className={`text-lg font-bold mb-2 text-center ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {errorType === "general"
                    ? language === "EN"
                      ? "Failed to mark attendance. Please try again."
                      : "Gagal menandai kehadiran. Silakan coba lagi."
                    : language === "EN"
                      ? "Error"
                      : "Kesalahan"}
                </Text>
                <Text
                  className={`text-center mb-4 ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {errorMessage}
                </Text>

                <View className="flex-row space-x-3">
                  <Button
                    title={language === "EN" ? "Close" : "Tutup"}
                    variant="secondary"
                    size="medium"
                    onPress={() => setShowErrorModal(false)}
                    className="flex-1"
                  />
                  <Button
                    title={language === "EN" ? "Try Again" : "Coba Lagi"}
                    variant="primary"
                    size="medium"
                    onPress={() => {
                      setShowErrorModal(false);
                      // Retry with the same device if available
                      if (selectedDevice) {
                        handleWebSocketNFCReading(selectedDevice);
                      }
                    }}
                    className="flex-1"
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaViewComponent>
  );
}

export default AttendanceShared;
