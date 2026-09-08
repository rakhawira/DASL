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
import {
  getAdminNews,
  getAttendanceStats,
  getNewsStats,
  getSessionStats,
  getUsers,
} from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function AdminHomeTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    todayAttendanceCount: 0,
    todayAttendancePercentage: 0,
    totalNews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { news: campusNews, loadNews } = useNews();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();

  const fetchStats = useCallback(
    async (isManualRefresh = false) => {
      try {
        setIsLoading(true);
        let totalUsers = 0;
        let activeUsers = 0;
        let todayAttendanceCount = 0;
        let totalNews = 0;

        const usersResponse = await getUsers();
        const sessionResponse = await getSessionStats();
        const attendanceResponse = await getAttendanceStats();
        const newsResponse = await getNewsStats();

        // Fetch campus news
        await loadNews();

        totalUsers = usersResponse?.data?.length || 0;
        activeUsers = sessionResponse?.data?.active_users || 0;
        todayAttendanceCount = attendanceResponse?.data?.today_count || 0;
        totalNews = newsResponse?.data?.total_news || 0;

        const attendancePercentage =
          totalUsers > 0
            ? Math.min(
                Math.round((todayAttendanceCount / totalUsers) * 100),
                100,
              )
            : 0;

        if (newsResponse?.success === false && totalNews === 0) {
          try {
            const adminNewsResponse = await getAdminNews({ limit: 1 });
            totalNews = adminNewsResponse?.data?.total || 0;
          } catch (fallbackError) {
            console.warn(
              "Alternative news endpoint also failed:",
              fallbackError,
            );
          }
        }

        setStats({
          totalUsers,
          activeUsers,
          todayAttendanceCount,
          todayAttendancePercentage: attendancePercentage,
          totalNews,
        });

        setIsLoading(false);

        // Only show toast on manual refresh
        if (isManualRefresh) {
          showToast(
            language === "EN"
              ? "Data refreshed successfully"
              : "Data berhasil diperbarui",
            "success",
          );
        }
      } catch (error) {
        console.error("Error in fetchStats:", error);
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          todayAttendanceCount: 0,
          todayAttendancePercentage: 0,
          totalNews: 0,
        });
        showToast(
          language === "EN"
            ? "Some data failed to load. Showing available information."
            : "Beberapa data gagal dimuat. Menampilkan informasi yang tersedia.",
          "info",
        );
        setIsLoading(false);
      }
    },
    [language, showToast],
  );

  useEffect(() => {
    registerRefreshFunction("adminHomeTab", () => fetchStats(true));
    return () => {
      unregisterRefreshFunction("adminHomeTab");
    };
  }, [registerRefreshFunction, unregisterRefreshFunction, fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats(true);
    setRefreshing(false);
  }, [fetchStats]);

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: stats.todayAttendancePercentage,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [stats.todayAttendancePercentage]);

  const handleViewLogs = () => {
    router.push("/admin/pages/ViewLogsPage");
  };

  const handleManageDevices = () => {
    router.push("/admin/pages/ManageDevicesPage");
  };

  const handleManageSSKM = () => {
    router.push("/admin/pages/ManageSSKMPage");
  };

  const handleManageCourse = () => {
    router.push("/admin/pages/ManageCoursePage");
  };

  const handleApproval = () => {
    router.push("/admin/pages/ManageApprovalPage");
  };

  const handleManageNews = () => {
    router.push("/admin/pages/ManageNewsPage");
  };

  const handlePerwalian = () => {
    router.push("/admin/pages/PerwalianPage");
  };

  const handleOpenCalendar = () => {
    router.push("/admin/pages/CalendarPage");
  };

  const quickActions = [
    {
      id: "view-logs",
      title: "View Logs",
      titleId: "Lihat Log",
      icon: "list-outline" as const,
      color: "#8B5CF6",
      onPress: handleViewLogs,
    },
    {
      id: "manage-devices",
      title: "Manage Devices",
      titleId: "Kelola Perangkat",
      icon: "hardware-chip-outline" as const,
      color: "#F59E0B",
      onPress: handleManageDevices,
    },
    {
      id: "manage-sskm",
      title: "Manage SSKM",
      titleId: "Kelola SSKM",
      icon: "school-outline" as const,
      color: "#10B981",
      onPress: handleManageSSKM,
    },
    {
      id: "manage-courses",
      title: "Manage Courses",
      titleId: "Kelola Mata Kuliah",
      icon: "book-outline" as const,
      color: "#3B82F6",
      onPress: handleManageCourse,
    },
    {
      id: "manage-approvals",
      title: "Manage Approvals",
      titleId: "Kelola Persetujuan",
      icon: "checkmark-circle-outline" as const,
      color: "#8B5CF6",
      onPress: handleApproval,
    },
    {
      id: "manage-news",
      title: "Manage News",
      titleId: "Kelola Berita",
      icon: "newspaper-outline" as const,
      color: "#EC4899",
      onPress: handleManageNews,
    },
    {
      id: "perwalian",
      title: "Perwalian",
      titleId: "Perwalian",
      icon: "people-outline" as const,
      color: "#22C55E",
      onPress: handlePerwalian,
    },
    {
      id: "calendar",
      title: "Calendar",
      titleId: "Kalender",
      icon: "calendar-outline" as const,
      color: "#06B6D4",
      onPress: handleOpenCalendar,
    },
  ];

  const StatCard = ({ icon, title, value, color }: any) => (
    <View
      className={`flex-1 mx-2 p-4 rounded-2xl ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon} size={24} color={color} />
        <Text
          className={`text-xs font-medium ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {language === "EN" ? "Total" : "Total"}
        </Text>
      </View>
      <Text
        className={`text-2xl font-bold ${
          isDarkMode ? "text-white" : "text-gray-800"
        }`}
      >
        {value}
      </Text>
      <Text
        className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <Header
        title={language === "EN" ? "Admin Dashboard" : "Dashboard Admin"}
        subtitle={
          language === "EN"
            ? `Welcome back, ${user?.name || "Admin"}`
            : `Selamat datang kembali, ${user?.name || "Admin"}`
        }
        isDarkMode={isDarkMode}
        rightComponent={
          <NotificationButton
            isDarkMode={isDarkMode}
            onPress={() => router.push("/admin/pages/NotificationPage")}
          />
        }
      />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EF4444"]}
            tintColor="#EF4444"
          />
        }
      >
        <View className="px-4 mb-6">
          <View className="flex-row mb-4">
            <StatCard
              icon="people-outline"
              title={language === "EN" ? "Users" : "Pengguna"}
              value={stats.totalUsers}
              color="#3B82F6"
            />
            <StatCard
              icon="checkmark-circle"
              title={language === "EN" ? "Active" : "Aktif"}
              value={stats.activeUsers}
              color="#10B981"
            />
          </View>
          <View className="flex-row">
            <StatCard
              icon="calendar-outline"
              title={language === "EN" ? "Attendance" : "Kehadiran"}
              value={stats.todayAttendanceCount}
              color="#F59E0B"
            />
            <StatCard
              icon="today-outline"
              title={language === "EN" ? "Today" : "Hari Ini"}
              value={`${stats.todayAttendancePercentage}%`}
              color="#EF4444"
            />
          </View>
        </View>

        <View className="px-6 mb-6">
          <View
            className={`p-4 rounded-2xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-lg`}
          >
            <Text
              className={`text-lg font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Today's Attendance" : "Kehadiran Hari Ini"}
            </Text>
            <View className="mb-3">
              <Text
                className={`text-sm mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {language === "EN" ? "Completion Rate" : "Tingkat Kehadiran"}
              </Text>
              <View
                className={`h-3 rounded-full ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <Animated.View
                  className="h-3 rounded-full bg-green-500"
                  style={{
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                      extrapolate: "clamp",
                    }),
                  }}
                />
              </View>
            </View>
            <Text
              className={`text-sm font-medium ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {stats.todayAttendancePercentage}

              {language === "EN"
                ? `% of users have checked in today`
                : `% pengguna sudah check in hari ini`}
            </Text>
          </View>
        </View>

        <CampusNewsCarousel
          isDarkMode={isDarkMode}
          language={language}
          showToast={showToast}
          maxItems={10}
          news={campusNews}
        />

        <QuickActionsCard
          quickActions={quickActions}
          isDarkMode={isDarkMode}
          language={language}
        />
      </ScrollView>
    </SafeAreaViewComponent>
  );
}
