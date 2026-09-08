import CampusNewsCarousel from "@/components/CampusNewsCarousel";
import Header from "@/components/Header";
import NotificationButton from "@/components/NotificationButton";
import QuickActionsCard from "@/components/QuickActionsCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { useNews } from "@/hooks/useNews";
import { getPerwalianStatus } from "@/services/api";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StatusBar } from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function LecturerHomeTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [perwalianRequestsEnabled, setPerwalianRequestsEnabled] =
    useState(false);
  const { news: campusNews, loadNews } = useNews();

  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    await Promise.all([loadNews()]);
  }, [loadNews]);

  // Register refresh function
  useEffect(() => {
    registerRefreshFunction("lecturerHomeTab", fetchAllData);
    return () => {
      unregisterRefreshFunction("lecturerHomeTab");
    };
  }, [registerRefreshFunction, unregisterRefreshFunction, fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Load perwalian requests setting from database only
  useEffect(() => {
    const loadPerwalianSetting = async () => {
      try {
        // Get from database only
        const response = await getPerwalianStatus();
        if (response.success && response.data) {
          setPerwalianRequestsEnabled(response.data.status);
          console.log(
            "Perwalian requests setting loaded from database:",
            response.data.status,
          );
        }
      } catch (error) {
        console.error("Error loading perwalian setting:", error);
      }
    };

    loadPerwalianSetting();

    // Set up periodic check with longer interval (5 seconds)
    const interval = setInterval(loadPerwalianSetting, 5000);

    return () => clearInterval(interval);
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    showToast(
      language === "EN"
        ? "Data refreshed successfully"
        : "Data berhasil diperbarui",
      "success",
    );
  }, [showToast, language, fetchAllData]);

  const handleOpenCalendar = () => {
    router.push("/lecturer/pages/CalendarPage");
  };

  const handleOpenViewLogs = () => {
    router.push("/lecturer/pages/ViewLogsPage");
  };

  const quickActions = [
    {
      id: "attendance",
      title: "Attendance",
      titleId: "Presensi",
      icon: "checkmark-circle-outline" as const,
      color: "#10B981",
      onPress: () =>
        showToast(
          language === "EN"
            ? "Attendance feature coming soon!"
            : "Fitur presensi segera hadir!",
          "info",
        ),
    },
    {
      id: "calendar",
      title: "Calendar",
      titleId: "Kalender",
      icon: "calendar-outline" as const,
      color: "#06B6D4",
      onPress: handleOpenCalendar,
    },
    {
      id: "grades",
      title: "Grades",
      titleId: "Nilai",
      icon: "analytics-outline" as const,
      color: "#8B5CF6",
      onPress: () =>
        showToast(
          language === "EN"
            ? "Grades feature coming soon!"
            : "Fitur nilai segera hadir!",
          "info",
        ),
    },
    {
      id: "viewlogs",
      title: "View Logs",
      titleId: "Lihat Log",
      icon: "document-text-outline" as const,
      color: "#F59E0B",
      onPress: handleOpenViewLogs,
    },
  ];

  const handleOpenPerwalian = () => {
    router.push("/lecturer/pages/PerwalianPage");
  };

  // Perwalian action for dosen wali
  const perwalianAction = {
    id: "perwalian",
    title: "Manage Perwalian",
    titleId: "Kelola Perwalian",
    icon: "people-outline" as const,
    color: "#EA580C",
    onPress: handleOpenPerwalian,
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={isDarkMode ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <Header
        title={language === "EN" ? "Lecturer Dashboard" : "Dashboard Dosen"}
        subtitle={
          language === "EN"
            ? `Welcome back, ${user?.name || "Lecturer"}`
            : `Selamat datang kembali, ${user?.name || "Dosen"}`
        }
        isDarkMode={isDarkMode}
        rightComponent={
          <NotificationButton
            isDarkMode={isDarkMode}
            onPress={() => router.push("/lecturer/pages/NotificationPage")}
          />
        }
      />

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // Extra padding for bottom navigation
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EF4444"]}
            tintColor="#EF4444"
          />
        }
      >
        {/* Campus News Carousel */}
        <CampusNewsCarousel
          isDarkMode={isDarkMode}
          language={language}
          showToast={showToast}
          maxItems={5}
          news={campusNews}
        />

        {/* Quick Actions */}
        <QuickActionsCard
          quickActions={quickActions}
          isDarkMode={isDarkMode}
          language={language}
        />

        {/* Perwalian Quick Action - Only show for dosen wali when enabled */}
        {user?.dosenType === "wali" && perwalianRequestsEnabled && (
          <QuickActionsCard
            quickActions={[perwalianAction]}
            isDarkMode={isDarkMode}
            language={language}
            title="Academic Advising"
            titleId="Bimbingan Akademik"
          />
        )}
      </ScrollView>
    </SafeAreaViewComponent>
  );
}
