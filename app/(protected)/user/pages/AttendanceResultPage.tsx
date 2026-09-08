import AttendanceResultShared from "@/app/(protected)/(shared)/AttendanceResultShared";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

// Helper: ambil string pertama kalau param berupa array (expo-router kadang
// mengembalikan string | string[] untuk query param yang sama)
function toSingleString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function AttendanceResultPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [attendanceData, setAttendanceData] = useState({
    username: "",
    name: "",
    deviceId: "",
    deviceName: "",
    timestamp: "",
    location: "",
    status: "present" as "present" | "late" | "absent",
  });

  useEffect(() => {
    // Parse attendance data dari route params
    setAttendanceData({
      username: toSingleString(params.username as string | string[]),
      name: toSingleString(params.name as string | string[]) || toSingleString(params.username as string | string[]),
      deviceId: toSingleString(params.deviceId as string | string[]),
      deviceName: toSingleString(params.deviceName as string | string[]),
      timestamp: toSingleString(params.timestamp as string | string[]) || new Date().toISOString(),
      location: toSingleString(params.location as string | string[]),
      status: (toSingleString(params.status as string | string[]) === "late" || toSingleString(params.status as string | string[]) === "absent")
        ? toSingleString(params.status as string | string[]) as "late" | "absent"
        : "present",
    });
  }, [params]);

  const handleBack = () => {
    router.back();
  };

  const handleNavigateToAttendance = () => {
    router.navigate("/(protected)/user/(tabs)/AttendanceTab");
  };

  return (
    <AttendanceResultShared
      {...attendanceData}
      isDarkMode={isDarkMode}
      language={language}
      onBack={handleBack}
      onNavigateToAttendance={handleNavigateToAttendance}
    />
  );
}
