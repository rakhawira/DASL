import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { Device } from "@/types/device";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRScannerShared from "../../(shared)/QRScannerShared";

export default function QRScannerPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Parse selected device from URL params if available
  const selectedDevice: Device | null = params.deviceId
    ? {
        id: parseInt(params.deviceId as string) || 0,
        device_id: params.deviceId as string,
        device_name: (params.deviceName as string) || "",
        location: (params.deviceLocation as string) || "",
        status:
          (params.deviceStatus as "online" | "offline" | "error" | "in_use") ||
          "online",
        ip_address: (params.deviceIp as string) || "",
        mac_address: (params.deviceMac as string) || "",
        firmware_version: (params.deviceFirmware as string) || "",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : null;

  const handleScanSuccess = (data: string) => {
    console.log("[Admin QR Scanner] Scan successful:", data);
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <QRScannerShared
      onScanSuccess={handleScanSuccess}
      onClose={handleClose}
      isDarkMode={isDarkMode}
      language={language}
      user={user}
      selectedDevice={selectedDevice}
      showToast={showToast}
      role="admin"
    />
  );
}
