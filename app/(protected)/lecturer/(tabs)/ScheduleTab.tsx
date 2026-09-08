import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { getCourses, getScheduleRequests } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface ClassSchedule {
  id: string;
  courseName: string;
  courseCode: string;
  startTime: string;
  endTime: string;
  room: string;
  students: number;
  sks?: number;
  hari?: string;
  lecturerName?: string;
  department?: string;
  is_active?: boolean;
  requestStatus?: "pending" | "approved" | "rejected";
}

export default function LecturerScheduleTab() {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const router = useRouter();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleRequests, setScheduleRequests] = useState<any[]>([]);

  const fetchScheduleRequests = useCallback(async () => {
    try {
      const response = await getScheduleRequests();
      if (response.success) {
        // Filter schedule requests to only show those requested by current user or for their courses
        const userRequests =
          response.data?.filter(
            (req: any) => req.requested_by === user?.name,
          ) || [];
        setScheduleRequests(userRequests);
      }
    } catch (error) {
      console.error("Error fetching schedule requests:", error);
    }
  }, [user?.name]);

  const fetchCoursesAndCreateSchedules = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch both courses and schedule requests
      const [coursesResponse, requestsResponse] = await Promise.all([
        getCourses(),
        getScheduleRequests(),
      ]);

      const coursesData = coursesResponse?.data || [];
      const requestsData = requestsResponse?.data || [];

      // Debug logging
      console.log("Schedule Tab - Courses Response:", coursesResponse);
      console.log("Schedule Tab - Courses Data:", coursesData);
      console.log("Schedule Tab - User Department:", user?.jurusan);
      console.log("Schedule Tab - User Name:", user?.name);

      // Store schedule requests for status checking
      setScheduleRequests(requestsData);

      if (!coursesData || !Array.isArray(coursesData)) {
        setSchedules([]);
        return;
      }

      const lecturerDepartment = user?.jurusan || "";
      const lecturerName = user?.name || "";
      const filteredCourses =
        coursesData?.filter(
          (course: any) =>
            course.jurusan === lecturerDepartment &&
            course.is_active &&
            (course.dosen_pengajar === lecturerName || !course.dosen_pengajar),
        ) || [];

      // Debug logging for filtering
      console.log("Schedule Tab - Total Courses:", coursesData.length);
      console.log("Schedule Tab - Filtered Courses:", filteredCourses.length);
      console.log("Schedule Tab - Sample Course:", coursesData[0]);

      // Find pending schedule request for each course
      const scheduleData = filteredCourses.map((course: any, index: number) => {
        const courseId = parseInt(course.id);

        // Check if there's a pending schedule request for this course
        const pendingRequest = requestsData.find(
          (req: any) => req.course_id === courseId && req.status === "pending",
        );

        return {
          id: course.id.toString(),
          courseName: course.nama_matkul,
          courseCode: course.kode_matkul,
          startTime: pendingRequest?.start_time || course.start_time || "",
          endTime: pendingRequest?.end_time || course.end_time || "",
          room: pendingRequest?.room || course.room || "",
          students: 0,
          sks: course.sks || 0,
          hari: pendingRequest?.hari || course.hari || "",
          lecturerName: course.dosen_pengajar || lecturerName,
          department: course.jurusan,
          is_active: course.is_active,
          requestStatus: pendingRequest?.status || undefined,
        };
      });

      setSchedules(scheduleData);
    } catch (error) {
      console.error("Error fetching courses:", error);
      showToast(
        language === "EN"
          ? "Failed to load courses"
          : "Gagal memuat mata kuliah",
        "error",
      );
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.jurusan, user?.name, language, showToast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCoursesAndCreateSchedules(),
      fetchScheduleRequests(),
    ]);
    setRefreshing(false);
    showToast(
      language === "EN"
        ? "Data refreshed successfully"
        : "Data berhasil diperbarui",
      "success",
    );
  }, [
    fetchCoursesAndCreateSchedules,
    fetchScheduleRequests,
    language,
    showToast,
  ]);

  useEffect(() => {
    if (user) {
      fetchCoursesAndCreateSchedules();
      fetchScheduleRequests();
    }
  }, [user, fetchCoursesAndCreateSchedules, fetchScheduleRequests]);

  const renderScheduleItem = ({ item }: { item: ClassSchedule }) => (
    <View
      className={`p-4 rounded-xl mb-3 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className={`text-lg font-semibold mb-1 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {item.courseName}
            </Text>
            {item.requestStatus === "pending" && (
              <View className="ml-2 px-2 py-1 rounded-full bg-amber-100">
                <Text className="text-xs font-medium text-amber-700">
                  {language === "EN" ? "Pending" : "Menunggu"}
                </Text>
              </View>
            )}
          </View>
          <Text
            className={`text-sm mb-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {item.courseCode} • {item.sks || 0} SKS
          </Text>
        </View>
      </View>

      <View className="space-y-1">
        {item.hari && (
          <View className="flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {item.hari}
            </Text>
          </View>
        )}
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {item.startTime} - {item.endTime}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name="location-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {item.room}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-end mt-3">
        <TouchableOpacity
          className={`px-3 py-1 rounded-lg ${
            isDarkMode ? "bg-blue-900" : "bg-blue-100"
          }`}
          onPress={() => {
            router.push({
              pathname: "/lecturer/pages/EditSchedulePage",
              params: {
                scheduleId: item.id,
                courseName: item.courseName,
                courseCode: item.courseCode,
                startTime: item.startTime,
                endTime: item.endTime,
                room: item.room,
                hari: item.hari || "",
                sks: item.sks?.toString() || "0",
              },
            });
          }}
          activeOpacity={0.7}
        >
          <Text
            className={`text-sm font-medium ${
              isDarkMode ? "text-blue-300" : "text-blue-700"
            }`}
          >
            {language === "EN" ? "Edit" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>
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
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={language === "EN" ? "Manage Schedule" : "Kelola Jadwal"}
          subtitle=""
          isDarkMode={isDarkMode}
        />

        <View className="px-6 flex-1">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`mt-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {language === "EN"
                  ? "Loading schedules..."
                  : "Memuat jadwal..."}
              </Text>
            </View>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              titleEN="No schedules yet"
              titleID="Belum ada jadwal"
              subtitleEN="Add your first class schedule"
              subtitleID="Tambah jadwal kelas pertama Anda"
              isDarkMode={isDarkMode}
              language={language}
            />
          ) : (
            <FlatList
              data={schedules}
              renderItem={renderScheduleItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#EF4444"
                  colors={["#EF4444"]}
                />
              }
            />
          )}
        </View>
      </View>
    </SafeAreaViewComponent>
  );
}
