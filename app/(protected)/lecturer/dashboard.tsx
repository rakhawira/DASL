import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function LecturerDashboard() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    router.replace("/lecturer/(tabs)");
  }, [router]);

  // Show loading state with matching background color to prevent white flash
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }} />
  );
}
