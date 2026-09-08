import Header from "@/components/Header";
import ToggleSwitch from "@/components/ToggleSwitch";
import { FACULTIES, MAJORS, ROLES } from "@/constants/academicData";
import { useAuth } from "@/hooks/useAuth";
import { useTimezone } from "@/hooks/useTimezone";
import { User } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface ProfileTabProps {
  user: User | null;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
}

export default function ProfileShared({
  user,
  isDarkMode,
  language,
  showToast,
  toggleLanguage,
  toggleTheme,
}: ProfileTabProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const isLoggingOut = React.useRef(false);
  const {
    timezoneInfo,
    loading: timezoneLoading,
    error: timezoneError,
  } = useTimezone();

  // Convert timezone abbreviation to IANA format for display
  const formatTimezoneForDisplay = (tz: string): string => {
    const tzLower = tz.toLowerCase();
    if (tzLower === "wib") return "Asia/Jakarta";
    if (tzLower === "wita") return "Asia/Makassar";
    if (tzLower === "wit") return "Asia/Jayapura";
    return tz;
  };

  const handleLogout = async () => {
    // Prevent duplicate logout calls
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    showToast(
      language === "EN" ? "Logging out..." : "Sedang keluar...",
      "info",
    );

    try {
      // Use the logout function from useAuth hook
      await logout();

      showToast(
        language === "EN" ? "Logged out successfully" : "Berhasil keluar",
        "success",
      );
    } catch (error) {
      console.error("Logout error:", error);
      showToast(
        language === "EN" ? "Logout failed" : "Gagal keluar",
        "error",
      );
    } finally {
      // Reset flag after navigation
      setTimeout(() => {
        isLoggingOut.current = false;
      }, 1000);
    }
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <Header
        title={language === "EN" ? "Profile" : "Profil"}
        isDarkMode={isDarkMode}
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="justify-start items-center px-6 pt-4">
          <View
            className={`w-full rounded-2xl p-6 mb-6 items-center ${
              isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            } shadow-sm border`}
          >
            <View className="w-28 h-28 rounded-full bg-red-500 items-center justify-center overflow-hidden">
              {user?.avatar ? (
                // @ts-ignore - Image type issue due to react-native module declaration
                <Image
                  source={{ uri: user.avatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-outline" size={56} color="white" />
              )}
            </View>
          </View>

          {/* User Identity Section */}
          {user && (
            <View className="w-full space-y-4 mb-8">
              <Text
                className={`text-lg font-bold mb-3 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN"
                  ? "Identity Information"
                  : "Informasi Identitas"}
              </Text>
              <View
                className={`rounded-xl p-4 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              >
                <View className="space-y-3">
                  <View className="flex-row justify-between">
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {language === "EN" ? "Full Name" : "Nama Lengkap"}
                    </Text>
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {user.name || "-"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {user.role === "mahasiswa"
                        ? language === "EN"
                          ? "Username/ID"
                          : "Username/ID"
                        : language === "EN"
                          ? "Username/ID"
                          : "Username/ID"}
                    </Text>
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {user.username}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {language === "EN" ? "Role" : "Peran"}
                    </Text>
                    <Text
                      className={`font-medium ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {ROLES.find((r) => r.value === user.role)?.label[
                        language
                      ] || user.role}
                    </Text>
                  </View>

                  {user.role === "mahasiswa" && (
                    <View className="flex-row justify-between">
                      <Text
                        className={`font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {language === "EN" ? "Major" : "Jurusan"}
                      </Text>
                      <Text
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {MAJORS.find((m) => m.value === user.jurusan)?.label[
                          language
                        ] ||
                          user.jurusan ||
                          "-"}
                      </Text>
                    </View>
                  )}

                  {user.role === "mahasiswa" && (
                    <View className="flex-row justify-between">
                      <Text
                        className={`font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {language === "EN" ? "Faculty" : "Fakultas"}
                      </Text>
                      <Text
                        className={`font-medium ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {FACULTIES.find((f) => f.value === user.fakultas)
                          ?.label[language] ||
                          user.fakultas ||
                          "-"}
                      </Text>
                    </View>
                  )}

                  {(user.role === "dosen" || user.role === "staff") &&
                    user.username && (
                      <View className="flex-row justify-between"></View>
                    )}
                </View>
              </View>
            </View>
          )}

          {/* Timezone Section */}
          <View className="w-full space-y-4 mb-8">
            <Text
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Timezone" : "Zona Waktu"}
            </Text>

            <View
              className={`rounded-xl p-4 mb-2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    timezoneError === "Location services disabled"
                      ? "location-outline"
                      : "time-outline"
                  }
                  size={20}
                  color={
                    timezoneError === "Location services disabled"
                      ? "#F59E0B"
                      : timezoneInfo.isIndonesia
                        ? "#EF4444"
                        : "#3B82F6"
                  }
                  className="mr-3"
                />
                <View className="flex-1">
                  <Text
                    className={`font-medium ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {timezoneLoading
                      ? language === "EN"
                        ? "Detecting timezone..."
                        : "Mendeteksi zona waktu..."
                      : formatTimezoneForDisplay(timezoneInfo.timezone)}
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {timezoneLoading
                      ? language === "EN"
                        ? "Please wait"
                        : "Mohon tunggu"
                      : timezoneError === "Location services disabled"
                        ? language === "EN"
                          ? "Using device timezone (location disabled)"
                          : "Menggunakan timezone device (lokasi dimatikan)"
                        : `${timezoneInfo.region} (UTC${timezoneInfo.offset})`}
                  </Text>
                </View>
                {!timezoneLoading && !timezoneError && (
                  <Ionicons
                    name="sync-outline"
                    size={16}
                    color={isDarkMode ? "#10B981" : "#059669"}
                  />
                )}
                {!timezoneLoading &&
                  timezoneError === "Location services disabled" && (
                    <Ionicons
                      name="warning-outline"
                      size={16}
                      color="#F59E0B"
                    />
                  )}
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View className="w-full space-y-4 mb-8">
            <Text
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Settings" : "Pengaturan"}
            </Text>

            {/* Language Toggle */}
            <View
              className={`rounded-xl p-4 mb-2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="language-outline"
                    size={20}
                    color={isDarkMode ? "#60A5FA" : "#3B82F6"}
                    className="mr-3"
                  />
                  <Text
                    className={`font-medium ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN" ? "Language" : "Bahasa"}
                  </Text>
                </View>
                <ToggleSwitch
                  value={language === "ID"}
                  onValueChange={toggleLanguage}
                  leftLabel="EN"
                  rightLabel="ID"
                  activeColor={language === "EN" ? "bg-gray-300" : "bg-red-500"}
                  inactiveColor={
                    language === "EN" ? "bg-gray-300" : "bg-red-500"
                  }
                />
              </View>
            </View>

            {/* Theme Toggle */}
            <View
              className={`rounded-xl p-4 mb-2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name={isDarkMode ? "moon-outline" : "sunny-outline"}
                    size={20}
                    color={isDarkMode ? "#F59E0B" : "#F97316"}
                    className="mr-3"
                  />
                  <Text
                    className={`font-medium ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN" ? "Dark Mode" : "Mode Gelap"}
                  </Text>
                </View>
                <ToggleSwitch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  leftLabel=""
                  rightLabel=""
                  activeColor="bg-red-500"
                  inactiveColor="bg-gray-300"
                  icon={{
                    left: {
                      name: "sunny-outline",
                      color: "text-white",
                    },
                    right: {
                      name: "moon-outline",
                      color: "text-gray-800",
                    },
                  }}
                />
              </View>
            </View>

            {/* Logout Button */}
            <View
              className={`rounded-xl p-4 mb-2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <TouchableOpacity
                className="flex-row items-center justify-between"
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="log-out-outline"
                    size={20}
                    color="#EF4444"
                    className="mr-3"
                  />
                  <Text
                    className={`font-medium ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN" ? "Logout" : "Keluar"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version Section */}
          <View className="w-full space-y-4 mb-8">
            <Text
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "App Version" : "Versi Aplikasi"}
            </Text>

            <View
              className={`rounded-xl p-4 mb-2 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#6B7280"
                  className="mr-3"
                />
                <Text
                  className={`font-medium ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "EN" ? "Version: 1.0.0" : "Versi: 1.0.0"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaViewComponent>
  );
}
