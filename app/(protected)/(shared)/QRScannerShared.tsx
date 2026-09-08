import Button from "@/components/Button";
import Header from "@/components/Header";
import { submitQRAttendance, triggerQRAttendance } from "@/services/api";
import { Device } from "@/types/device";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, Vibration, View } from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface QRScannerPageProps {
  onScanSuccess: (data: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
  language: "EN" | "ID";
  user: any;
  selectedDevice?: Device | null;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
  role?: "admin" | "lecturer" | "user"; // Role for navigation
}

export default function QRScannerShared({
  onScanSuccess,
  onClose,
  isDarkMode,
  language,
  user,
  selectedDevice,
  showToast,
  role = "user", // Default to user for backward compatibility
}: QRScannerPageProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generatedQRCode, setGeneratedQRCode] = useState<string | null>(null);
  const [scanSuccessData, setScanSuccessData] = useState<{
    qrCode: string;
    timestamp: string;
  } | null>(null);

  const router = useRouter();

  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarcodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(100);

    // Validate QR code format
    if (!data || data.length === 0) {
      showInvalidQRAlert();
      return;
    }

    // Trim whitespace
    const qrCode = data.trim();

    // Check if QR code looks valid (alphanumeric, reasonable length)
    if (qrCode.length < 3 || qrCode.length > 100) {
      showInvalidQRAlert();
      return;
    }

    // Show scan success feedback immediately
    setScanSuccessData({
      qrCode: qrCode,
      timestamp: new Date().toISOString(),
    });

    // Auto-hide success banner after 3 seconds
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      setScanSuccessData(null);
    }, 3000);

    // Send QR code to backend API for validation and database logging (like NFC)
    submitQRCodeForValidation(qrCode);
  };

  const submitQRCodeForValidation = async (qrCode: string) => {
    if (!user?.username) {
      showToast &&
        showToast(
          language === "EN"
            ? "User information not available"
            : "Informasi pengguna tidak tersedia",
          "error",
        );
      setScanned(false);
      return;
    }

    if (!selectedDevice?.device_id) {
      showToast &&
        showToast(
          language === "EN"
            ? "Device information not available"
            : "Informasi perangkat tidak tersedia",
          "error",
        );
      setScanned(false);
      return;
    }

    try {
      showToast &&
        showToast(
          language === "EN"
            ? "Validating QR code..."
            : "Memvalidasi kode QR...",
          "info",
        );

      const response = await submitQRAttendance({
        device_id: selectedDevice.device_id,
        qr_data: qrCode,
        username: user.username,
        name: user.name || user.username,
        timestamp: Date.now(),
      });

      if (response.success && response.data) {
        // Navigate to success screen with attendance data
        const attendance = response.data.attendance || response.data;
        const resultPath =
          role === "admin"
            ? "/(protected)/admin/pages/AttendanceResultPage"
            : role === "lecturer"
              ? "/(protected)/lecturer/pages/AttendanceResultPage"
              : "/(protected)/user/pages/AttendanceResultPage";

        router.push({
          pathname: resultPath as any,
          params: {
            username: attendance.username || user.username,
            name: attendance.name || user.name || user.username,
            deviceId:
              attendance.deviceId ||
              attendance.device_id ||
              selectedDevice?.device_id,
            deviceName: attendance.deviceName || selectedDevice?.device_name,
            timestamp: attendance.timestamp || new Date().toISOString(),
            location: attendance.location || selectedDevice?.location || "",
            status: attendance.status || "present",
          },
        });
        setScanned(false);
        setScanSuccessData(null);

        showToast &&
          showToast(
            language === "EN"
              ? "Attendance marked successfully!"
              : "Absensi berhasil ditandai!",
            "success",
          );
      } else {
        throw new Error(response.message || "Failed to mark attendance");
      }
    } catch (error: any) {
      setScanned(false);
      setScanSuccessData(null);

      showToast &&
        showToast(
          error.message ||
            (language === "EN"
              ? "Invalid or expired QR code"
              : "Kode QR tidak valid atau sudah kadaluarsa"),
          "error",
        );
    }
  };

  const showInvalidQRAlert = () => {
    Alert.alert(
      language === "EN" ? "Invalid QR Code" : "QR Code Tidak Valid",
      language === "EN"
        ? "This QR code is not for attendance."
        : "QR code ini tidak untuk absensi.",
      [
        {
          text: language === "EN" ? "OK" : "OK",
          onPress: () => setScanned(false),
        },
      ],
    );
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
  };

  // Handle Generate QR button click
  const handleGenerateQR = async () => {
    if (!selectedDevice) {
      showToast &&
        showToast(
          language === "EN"
            ? "Please select a device first"
            : "Silakan pilih perangkat terlebih dahulu",
          "error",
        );
      return;
    }

    if (!user?.username) {
      showToast &&
        showToast(
          language === "EN"
            ? "User information not available"
            : "Informasi pengguna tidak tersedia",
          "error",
        );
      return;
    }

    setIsGeneratingQR(true);

    try {
      const apiResponse = await triggerQRAttendance(
        selectedDevice.device_id,
        user.username,
        user.name,
      );

      if (apiResponse.success) {
        if (apiResponse.data?.qr_code) {
          setGeneratedQRCode(apiResponse.data.qr_code);
        }

        showToast &&
          showToast(
            language === "EN"
              ? "QR code generated. Please scan it with your camera."
              : "Kode QR dibuat. Silakan pindai dengan kamera Anda.",
            "info",
          );
      }
    } catch (error) {
      showToast &&
        showToast(
          language === "EN"
            ? "Failed to generate QR code. Please try again."
            : "Gagal membuat kode QR. Silakan coba lagi.",
          "error",
        );
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Reusable header props
  const headerProps = {
    title: language === "EN" ? "QR Scanner" : "Pemindai QR",
    subtitle:
      language === "EN"
        ? "Scan QR codes for attendance"
        : "Pindai QR code untuk absensi",
    isDarkMode,
    onBack: onClose,
  };

  // Loading state
  if (hasPermission === null) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <Header {...headerProps} />
        <View className="flex-1 justify-center items-center px-6">
          <ActivityIndicator
            size="large"
            color={isDarkMode ? "#60A5FA" : "#3B82F6"}
            className="mb-4"
          />
          <Text
            className={`text-lg text-center ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {language === "EN"
              ? "Requesting camera permission..."
              : "Meminta izin kamera..."}
          </Text>
        </View>
      </SafeAreaViewComponent>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        edges={["top", "left", "right", "bottom"]}
      >
        <Header
          {...headerProps}
          subtitle={
            language === "EN"
              ? "Camera permission required"
              : "Izin kamera diperlukan"
          }
        />
        <View className="flex-1 justify-center items-center px-6">
          <View
            className={`p-6 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-md`}
          >
            <MaterialCommunityIcons
              name="camera-off"
              size={64}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              className="mb-4 self-center"
            />
            <Text
              className={`text-lg text-center mb-4 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN"
                ? "Camera permission is required to scan QR codes"
                : "Izin kamera diperlukan untuk memindai QR code"}
            </Text>
            <Button
              title={language === "EN" ? "Go Back" : "Kembali"}
              variant="primary"
              size="medium"
              onPress={onClose}
              className="w-full"
            />
          </View>
        </View>
      </SafeAreaViewComponent>
    );
  }

  // Main camera view
  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <Header {...headerProps} />

      {/* Scan Success Banner - Below Header */}
      {scanSuccessData && (
        <View
          className={`mx-4 mt-2 p-4 rounded-lg ${
            isDarkMode ? "bg-green-900" : "bg-green-100"
          } border-2 ${isDarkMode ? "border-green-600" : "border-green-400"}`}
        >
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={isDarkMode ? "#4ADE80" : "#16A34A"}
            />
            <View className="flex-1 ml-3">
              <Text
                className={`font-semibold text-base ${
                  isDarkMode ? "text-green-300" : "text-green-800"
                }`}
              >
                {language === "EN" ? "QR Code Scanned!" : "QR Code Terbaca!"}
              </Text>
              <Text
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-green-400" : "text-green-700"
                }`}
                numberOfLines={1}
              >
                {scanSuccessData.qrCode.length > 30
                  ? `${scanSuccessData.qrCode.substring(0, 30)}...`
                  : scanSuccessData.qrCode}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  isDarkMode ? "text-green-500" : "text-green-600"
                }`}
              >
                {language === "EN" ? "Validating..." : "Memvalidasi..."}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Camera View - below header */}
      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          onCameraReady={onCameraReady}
          enableTorch={false}
        />

        {/* Scanning Overlay */}
        <View className="absolute inset-0 justify-center items-center">
          <View className="items-center">
            {/* Scanning Frame */}
            <View className="w-72 h-72 border-2 border-green-400 rounded-lg">
              {/* Corner Markers */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />

              {/* Scanning Line Animation */}
              <View className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 transform -translate-y-1/2">
                <View className="w-full h-0.5 bg-green-400 animate-pulse" />
              </View>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View className="absolute bottom-20 left-0 right-0 px-6">
          <View
            className={`${
              isDarkMode ? "bg-gray-900" : "bg-black"
            } bg-opacity-70 p-4 rounded-lg`}
          >
            <Text
              className={`text-center text-sm mb-2 font-medium ${
                isDarkMode ? "text-gray-100" : "text-white"
              }`}
            >
              {language === "EN"
                ? "Align QR code within the frame to scan"
                : "Sejajarkan QR code dalam bingkai untuk dipindai"}
            </Text>
            <Text
              className={`text-center text-xs ${
                isDarkMode ? "text-gray-400" : "text-gray-300"
              }`}
            >
              {language === "EN"
                ? "Make sure the QR code is clear and well-lit"
                : "Pastikan QR code jelas dan pencahayaan cukup"}
            </Text>

            {/* Generate QR Button */}
            <Button
              title={
                isGeneratingQR
                  ? language === "EN"
                    ? "Generating..."
                    : "Membuat QR..."
                  : language === "EN"
                    ? "Generate QR"
                    : "Generate QR"
              }
              variant="primary"
              size="medium"
              onPress={handleGenerateQR}
              disabled={isGeneratingQR || !selectedDevice}
              loading={isGeneratingQR}
              className="mt-4 w-full"
            />

            {/* Show selected device info */}
            {selectedDevice && (
              <View className="mt-3 p-2 rounded bg-opacity-50 bg-gray-700">
                <Text className="text-xs text-gray-300 text-center">
                  {language === "EN" ? "Device: " : "Perangkat: "}
                  {selectedDevice.device_name || selectedDevice.device_id}
                </Text>
              </View>
            )}

            {!selectedDevice && (
              <View className="mt-3 p-2 rounded bg-opacity-50 bg-red-900">
                <Text className="text-xs text-red-300 text-center">
                  {language === "EN"
                    ? "Please select a device from the device list first"
                    : "Silakan pilih perangkat dari daftar terlebih dahulu"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Reset Button (if scanned) */}
        {scanned && (
          <View className="absolute bottom-32 left-0 right-0 px-6">
            <Button
              title={language === "EN" ? "Scan Again" : "Pindai Lagi"}
              variant="primary"
              size="medium"
              onPress={() => setScanned(false)}
              className="w-full"
            />
          </View>
        )}
      </View>
    </SafeAreaViewComponent>
  );
}
