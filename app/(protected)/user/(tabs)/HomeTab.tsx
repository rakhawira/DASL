import CampusNewsCarousel from "@/components/CampusNewsCarousel";
import Header from "@/components/Header";
import NextClassCarousel from "@/components/NextClassCarousel";
import NotificationButton from "@/components/NotificationButton";
import QuickActionsCard from "@/components/QuickActionsCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { useNews } from "@/hooks/useNews";
import { useTimezone } from "@/hooks/useTimezone";
import {
    getActivityPoints,
    getMaxRequiredPoints,
    getPerwalianCourses,
    getPerwalianStatus,
} from "@/services/api";
import { formatDate } from "@/utils/dateUtils";
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

export default function UserHomeTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refreshSpecific } = useRefresh();
  const { timezoneInfo } = useTimezone();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [sskmData, setSskmData] = useState({
    totalPoints: 0,
    requiredPoints: 100,
    activities: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perwalianRequestsEnabled, setPerwalianRequestsEnabled] =
    useState(false);
  const [approvedCourses, setApprovedCourses] = useState<any[]>([]);
  const [nextClasses, setNextClasses] = useState<any[]>([]);
  const { news: campusNews, loadNews } = useNews();

  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();

  const fetchSSKMData = async () => {
    try {
      // Fetch max required points from config (sync with Manage SSKM)
      let requiredPoints = 0;
      try {
        const maxPointsResponse = await getMaxRequiredPoints();
        if (
          maxPointsResponse?.success &&
          maxPointsResponse.data?.maxRequiredPoints
        ) {
          requiredPoints = maxPointsResponse.data.maxRequiredPoints;
        }
      } catch (configError) {
        console.warn(
          "Failed to fetch max required points, using default:",
          configError,
        );
      }

      if (user?.id) {
        // Fetch all activity points and filter by student (same method as Manage SSKM)
        const response = await getActivityPoints();
        if (response?.success && Array.isArray(response.data)) {
          // Filter activities for current student and sum points (sync with Manage SSKM logic)
          const studentActivities = response.data.filter(
            (activity: any) => activity.student_id === user.id,
          );
          const totalPoints = studentActivities.reduce(
            (sum: number, activity: any) => sum + (activity.points || 0),
            0,
          );

          setSskmData({
            totalPoints,
            requiredPoints,
            activities: studentActivities,
          });
        } else {
          setSskmData({
            totalPoints: 0,
            requiredPoints,
            activities: [],
          });
        }
      }
    } catch (error: any) {
      // Silently handle server errors - UI shows fallback data
      if (error?.response?.status !== 500) {
        console.error("Error fetching SSKM data:", error);
      }
      // Graceful fallback - don't crash the UI
      setSskmData({
        totalPoints: 0,
        requiredPoints: 100,
        activities: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch approved perwalian courses and determine next class
  const fetchPerwalianCourses = async () => {
    if (!user?.id) return;

    try {
      const response = await getPerwalianCourses(user.id);
      if (response.success && response.data) {
        // Filter only approved courses
        const approved = response.data.filter(
          (item: any) => item.status === "approved" && item.course,
        );
        setApprovedCourses(approved);

        // Determine next classes based on schedule
        if (approved.length > 0) {
          const nextClassesData = determineNextClasses(approved);
          setNextClasses(nextClassesData);
        } else {
          setNextClasses([]);
        }
      }
    } catch (error) {
      console.error("Error fetching perwalian courses:", error);
    }
  };

  // Helper function to convert time based on timezone
  const convertTimeToTimezone = (timeStr: string): string => {
    const [hour, minute] = timeStr.split(":").map(Number);
    let convertedHour = hour;

    // Convert from WIB (GMT+7) to user's timezone
    const tz = timezoneInfo.timezone.toLowerCase();
    if (tz === "wita" || tz === "asia/makassar") {
      convertedHour = (hour + 1) % 24;
    } else if (tz === "wit" || tz === "asia/jayapura") {
      convertedHour = (hour + 2) % 24;
    }
    // For WIB or unrecognized timezones (including UTC), use original WIB time

    return `${String(convertedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  // Helper function to determine next classes based on schedule
  const determineNextClasses = (courses: any[]) => {
    const daysOrder = [
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
      "Minggu",
    ];
    const today = new Date();
    const currentDayIndex = today.getDay() - 1; // 0 = Senin, 6 = Minggu
    const currentTime = today.getHours() * 60 + today.getMinutes(); // Minutes since midnight

    // Calculate all upcoming classes
    const upcomingClasses: any[] = [];

    for (const item of courses) {
      const course = item.course;
      if (!course?.hari || !course?.start_time) continue;

      const courseDayIndex = daysOrder.indexOf(course.hari);
      if (courseDayIndex === -1) continue;

      // Parse start time (format: "HH:MM")
      const [startHour, startMinute] = course.start_time.split(":").map(Number);
      const courseStartTime = startHour * 60 + startMinute;

      // Calculate days difference
      let daysDiff = courseDayIndex - currentDayIndex;
      let timeDiff = courseStartTime - currentTime;

      // If it's today but the class has already started, skip
      if (daysDiff === 0 && timeDiff <= 0) {
        continue;
      }

      // If it's a past day this week, add 7 days
      if (daysDiff < 0) {
        daysDiff += 7;
      }

      // Calculate remaining time
      const remainingDays = daysDiff;
      const remainingHours = Math.floor(timeDiff / 60);
      const remainingMinutes = timeDiff % 60;

      let remainingTimeText = "";
      if (remainingDays > 0) {
        remainingTimeText = `${remainingDays} hari lagi`;
      } else if (remainingHours > 0) {
        remainingTimeText = `${remainingHours} jam ${remainingMinutes} menit lagi`;
      } else {
        remainingTimeText = `${remainingMinutes} menit lagi`;
      }

      // Convert times to user's timezone
      const convertedStartTime = convertTimeToTimezone(course.start_time);
      const convertedEndTime = convertTimeToTimezone(course.end_time);

      // Format timezone display
      const tz = timezoneInfo.timezone.toLowerCase();
      let tzDisplay = timezoneInfo.timezone;
      if (tz === "wib" || tz === "asia/jakarta") {
        tzDisplay = "WIB";
      } else if (tz === "wita" || tz === "asia/makassar") {
        tzDisplay = "WITA";
      } else if (tz === "wit" || tz === "asia/jayapura") {
        tzDisplay = "WIT";
      } else {
        tzDisplay = "WIB"; // Default to WIB for Indonesian users
      }
      tzDisplay = tzDisplay.toLowerCase();
      // If timezone is already an abbreviation, use it directly
      if (tz === "wib" || tz === "wita" || tz === "wit") {
        tzDisplay = timezoneInfo.timezone.toUpperCase();
      } else if (tz === "asia/jakarta") {
        tzDisplay = "WIB";
      } else if (tz === "asia/makassar") {
        tzDisplay = "WITA";
      } else if (tz === "asia/jayapura") {
        tzDisplay = "WIT";
      } else {
        // Default to WIB for Indonesian users if timezone is not recognized
        tzDisplay = "WIB";
      }

      upcomingClasses.push({
        subject: course.nama_matkul,
        time: `${course.hari}, ${convertedStartTime}-${convertedEndTime} ${tzDisplay}`,
        room: course.room || "TBD",
        remainingTime: remainingTimeText,
        sks: course.sks,
        dosen: course.dosen_pengajar,
        day: course.hari,
        startTime: convertedStartTime,
        endTime: convertedEndTime,
        currentSession: 2,
        totalSessions: 16,
        daysDiff,
        timeDiff,
      });
    }

    // Sort by days difference, then by time difference
    upcomingClasses.sort((a, b) => {
      if (a.daysDiff !== b.daysDiff) {
        return a.daysDiff - b.daysDiff;
      }
      return a.timeDiff - b.timeDiff;
    });

    // Return up to 5 upcoming classes
    return upcomingClasses.slice(0, 5);
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchSSKMData(), fetchPerwalianCourses(), loadNews()]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    registerRefreshFunction("userHomeTab", fetchAllData);
    return () => {
      unregisterRefreshFunction("userHomeTab");
    };
  }, [registerRefreshFunction, unregisterRefreshFunction, fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
  }, [fetchAllData, showToast, language]);

  const handleOpenSchedule = () => {
    console.log("Navigating to Schedule Page");
  };

  const handleOpenCalendar = () => {
    router.push("/user/pages/CalendarPage");
  };

  const handleOpenViewLogs = () => {
    router.push("/user/pages/ViewLogsPage");
  };

  const handleOpenPerwalian = () => {
    router.push("/user/pages/PerwalianPage");
  };

  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: (sskmData.totalPoints / sskmData.requiredPoints) * 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [sskmData.totalPoints, sskmData.requiredPoints]);

  // Load perwalian requests setting from database
  useEffect(() => {
    const loadPerwalianSetting = async () => {
      try {
        const response = await getPerwalianStatus();
        if (response.success && response.data) {
          setPerwalianRequestsEnabled(response.data.status);
        }
      } catch (error) {
        console.error("Error loading perwalian setting:", error);
      }
    };

    loadPerwalianSetting();

    // Set up periodic check (5 seconds)
    const interval = setInterval(loadPerwalianSetting, 5000);

    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    {
      id: "schedule",
      title: "Schedule",
      titleId: "Jadwal",
      icon: "time-outline" as const,
      color: "#3B82F6",
      onPress: handleOpenSchedule,
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
      id: "viewlogs",
      title: "View Logs",
      titleId: "Lihat Log",
      icon: "document-text-outline" as const,
      color: "#10B981",
      onPress: handleOpenViewLogs,
    },
  ];

  // Perwalian action - shown separately when enabled
  const perwalianAction = {
    id: "perwalian",
    title: "Guidance",
    titleId: "Perwalian",
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
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <Header
        title={language === "EN" ? "Student Dashboard" : "Dashboard Mahasiswa"}
        subtitle={
          language === "EN"
            ? `Welcome back, ${user?.name || "Student"}`
            : `Selamat datang kembali, ${user?.name || "Mahasiswa"}`
        }
        isDarkMode={isDarkMode}
        rightComponent={
          <NotificationButton
            isDarkMode={isDarkMode}
            onPress={() => router.push("/user/pages/NotificationPage")}
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
        {/* Campus News Carousel */}
        <CampusNewsCarousel
          isDarkMode={isDarkMode}
          language={language}
          showToast={showToast}
          maxItems={5}
          news={campusNews}
        />

        {/* Next Class */}
        <NextClassCarousel
          isDarkMode={isDarkMode}
          language={language}
          classes={nextClasses}
        />

        {/* SSKM Points Card */}
        <View className="px-6 mb-6">
          <Text
            className={`text-lg font-bold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {language === "EN" ? "SSKM Points" : "Poin SSKM"}
          </Text>
          <View
            className={`p-4 rounded-2xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
          >
            {/* Progress Section */}
            <View className="mb-4">
              <Text
                className={`text-sm mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {language === "EN"
                  ? `${sskmData.totalPoints} of ${sskmData.requiredPoints} points`
                  : `${sskmData.totalPoints} dari ${sskmData.requiredPoints} poin`}
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
              <Text
                className={`text-sm font-medium mt-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {language === "EN"
                  ? `${Math.round((sskmData.totalPoints / sskmData.requiredPoints) * 100)}% completed`
                  : `${Math.round((sskmData.totalPoints / sskmData.requiredPoints) * 100)}% selesai`}
              </Text>
            </View>

            {/* Activities List */}
            {sskmData.activities.length > 0 && (
              <View className="mt-2">
                <Text
                  className={`text-sm font-semibold mb-2 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Activities" : "Kegiatan"} (
                  {sskmData.activities.length})
                </Text>
                {sskmData.activities
                  .slice(0, 3)
                  .map((activity: any, index: number) => (
                    <View
                      key={activity.id || index}
                      className={`py-2 ${
                        index !== sskmData.activities.slice(0, 3).length - 1
                          ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`
                          : ""
                      }`}
                    >
                      {/* Row 1: Activity Name & Points */}
                      <View className="flex-row justify-between items-start mb-1">
                        <Text
                          className={`text-sm font-semibold flex-1 pr-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                          numberOfLines={1}
                        >
                          {activity.activity_name}
                        </Text>
                        <Text
                          className={`text-sm font-bold ${
                            isDarkMode ? "text-green-400" : "text-green-600"
                          }`}
                        >
                          +{activity.points} pts
                        </Text>
                      </View>

                      {/* Row 2: Description */}
                      {activity.description && (
                        <Text
                          className={`text-xs mb-1 ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                          numberOfLines={1}
                        >
                          {activity.description}
                        </Text>
                      )}

                      {/* Row 3: Type & Date */}
                      <View className="flex-row justify-between items-center">
                        <Text
                          className={`text-xs px-2 py-0.5 rounded ${
                            isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {activity.activity_type}
                        </Text>
                        <Text
                          className={`text-xs ${
                            isDarkMode ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          {formatDate(
                            activity.date || activity.created_at || "",
                          )}
                        </Text>
                      </View>
                    </View>
                  ))}
                {sskmData.activities.length > 3 && (
                  <Text
                    className={`text-xs text-center mt-2 ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    {language === "EN"
                      ? `+${sskmData.activities.length - 3} more activities`
                      : `+${sskmData.activities.length - 3} kegiatan lainnya`}
                  </Text>
                )}
              </View>
            )}

            {sskmData.activities.length === 0 && (
              <View className="mt-2 py-3">
                <Text
                  className={`text-sm text-center ${
                    isDarkMode ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {language === "EN"
                    ? "No activities recorded yet"
                    : "Belum ada kegiatan tercatat"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <QuickActionsCard
          quickActions={quickActions}
          isDarkMode={isDarkMode}
          language={language}
        />

        {/* Perwalian Quick Action - Only show when enabled */}
        {perwalianRequestsEnabled && (
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
