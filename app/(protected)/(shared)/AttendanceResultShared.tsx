import Button from "@/components/Button";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface AttendanceResultProps {
  username: string;
  name?: string;
  deviceId: string;
  deviceName?: string;
  timestamp: string;
  location?: string;
  status?: "present" | "late" | "absent";
  isDarkMode: boolean;
  language: "EN" | "ID";
  onBack?: () => void;
  onNavigateToAttendance?: () => void;
  showToast?: (message: string, type: "success" | "error" | "info") => void;
}

const STATUS_STYLES = {
  present: { badge: "bg-green-100", text: "text-green-800" },
  late: { badge: "bg-yellow-100", text: "text-yellow-800" },
  absent: { badge: "bg-red-100", text: "text-red-800" },
} as const;

const STATUS_LABELS = {
  present: { EN: "Present", ID: "Hadir" },
  late: { EN: "Late", ID: "Terlambat" },
  absent: { EN: "Absent", ID: "Tidak Hadir" },
} as const;

export default function AttendanceResultShared({
  username,
  name,
  deviceId,
  deviceName,
  timestamp,
  location,
  status = "present",
  isDarkMode,
  language,
  onBack,
  onNavigateToAttendance,
  showToast,
}: AttendanceResultProps) {
  // Format tanggal untuk ditampilkan (5 July 2026)
  const formatDateCustom = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString(
          language === "EN" ? "en-US" : "id-ID",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          },
        );
      }
      return date.toLocaleDateString(language === "EN" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return new Date().toLocaleDateString(
        language === "EN" ? "en-US" : "id-ID",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      );
    }
  };

  // Format waktu untuk ditampilkan
  const formatTimeCustom = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // If timestamp is a number (milliseconds), try parsing it
        const timestampNum = parseInt(dateString);
        if (!isNaN(timestampNum)) {
          const dateFromNum = new Date(timestampNum);
          if (!isNaN(dateFromNum.getTime())) {
            return dateFromNum.toLocaleTimeString(
              language === "EN" ? "en-US" : "id-ID",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: language === "EN",
              },
            );
          }
        }
        return "-";
      }
      return date.toLocaleTimeString(language === "EN" ? "en-US" : "id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: language === "EN",
      });
    } catch (error) {
      return "-";
    }
  };

  const statusStyle = STATUS_STYLES[status];
  const statusLabel = STATUS_LABELS[status][language === "EN" ? "EN" : "ID"];

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <Header
        title={language === "EN" ? "Attendance Success" : "Absensi Berhasil"}
        subtitle={
          language === "EN"
            ? "Your attendance has been recorded"
            : "Absensi Anda telah dicatat"
        }
        isDarkMode={isDarkMode}
      />

      <View className="flex-1">
        {/* Scrollable Content */}
        <View className="flex-1 px-6 pt-4">
          {/* Attendance Details Card */}
          <View
            className={`w-full p-4 rounded-2xl shadow-lg ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* Header with Name and Status */}
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1">
                <Text
                  className={`font-semibold text-lg ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {name || username}
                </Text>
                {username && name !== username && (
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {username}
                  </Text>
                )}
              </View>
              <View className={`px-3 py-1 rounded-full ${statusStyle.badge}`}>
                <Text className={`text-xs font-medium ${statusStyle.text}`}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            {/* Date */}
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                className="mr-2"
              />
              <Text
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "EN" ? "Date" : "Tanggal"}:{" "}
                {formatDateCustom(timestamp)}
              </Text>
            </View>

            {/* Time */}
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="time-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                className="mr-2"
              />
              <Text
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "EN" ? "Time" : "Waktu"}:{" "}
                {formatTimeCustom(timestamp)}
              </Text>
            </View>

            {/* Device ID */}
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="card-outline"
                size={16}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                className="mr-2"
              />
              <Text
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Device ID: {deviceId}
              </Text>
            </View>

            {/* Device Name */}
            {deviceName && (
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="hardware-chip-outline"
                  size={16}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  className="mr-2"
                />
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {language === "EN" ? "Device" : "Perangkat"}: {deviceName}
                </Text>
              </View>
            )}

            {/* Location */}
            {location && (
              <View className="flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  className="mr-2"
                />
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {location}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Fixed Button at Bottom */}
        <View className="px-6 pb-6 pt-4">
          <Button
            title={
              language === "EN" ? "Back to Attendance" : "Kembali ke Absensi"
            }
            variant="primary"
            size="medium"
            onPress={() => {
              if (onNavigateToAttendance) {
                onNavigateToAttendance();
              } else if (onBack) {
                onBack();
              }
            }}
            className="w-full"
          />
        </View>
      </View>
    </SafeAreaViewComponent>
  );
}
