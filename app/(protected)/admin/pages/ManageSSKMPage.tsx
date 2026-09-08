import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
  deleteActivityPoint,
  getActivityPoints,
  getMaxRequiredPoints,
  getUsers,
} from "@/services/api";
import { ActivityPoint } from "@/types/sskm";
import { User } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function ManageSSKMTab(): React.ReactNode {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [activityPoints, setActivityPoints] = useState<ActivityPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityPoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [maxRequiredPoints, setMaxRequiredPoints] = useState<number>(100);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch students and activity points from API
  const fetchStudents = async () => {
    try {
      setIsLoading(true);

      // Fetch students
      const usersResponse = await getUsers();
      const allUsers = usersResponse.data || [];
      const studentUsers = allUsers.filter(
        (user: User) => user.role === "mahasiswa",
      );
      setStudents(studentUsers);

      // Fetch activity points
      const activityResponse = await getActivityPoints();
      const pointsData = activityResponse.success ? activityResponse.data : [];
      setActivityPoints(pointsData);
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast(
        language === "EN"
          ? "Failed to load students"
          : "Gagal memuat mahasiswa",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  }, []);

  // Load students on component mount
  useEffect(() => {
    fetchStudents();
    fetchMaxRequiredPoints();
  }, []);

  // Fetch max required points from API
  const fetchMaxRequiredPoints = async () => {
    try {
      const response = await getMaxRequiredPoints();
      if (response.success && response.data) {
        setMaxRequiredPoints(response.data.maxRequiredPoints || 100);
      }
    } catch (error) {
      console.error("Error fetching max required points:", error);
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;

    setIsDeleting(true);
    try {
      const response = await deleteActivityPoint(selectedActivity.id);

      if (response.success) {
        // Refresh data
        await fetchStudents();

        setShowDeleteConfirm(false);
        setSelectedActivity(null);

        showToast(
          language === "EN"
            ? "Activity deleted successfully"
            : "Kegiatan berhasil dihapus",
          "success",
        );
      } else {
        showToast(
          language === "EN"
            ? "Failed to delete activity"
            : "Gagal menghapus kegiatan",
          "error",
        );
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      showToast(
        language === "EN"
          ? "Failed to delete activity"
          : "Gagal menghapus kegiatan",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Get student's total points
  const getStudentPoints = (studentId: number) => {
    return activityPoints
      .filter((activity) => activity.student_id === studentId)
      .reduce(
        (sum: number, activity: ActivityPoint) => sum + activity.points,
        0,
      );
  };

  // Get student's activities
  const getStudentActivities = (studentId: number) => {
    return activityPoints.filter(
      (activity) => activity.student_id === studentId,
    );
  };

  // Handle student selection
  const handleStudentSelect = (student: User) => {
    setSelectedStudent(student);
    router.push({
      pathname: "/admin/pages/StudentDetailsPage",
      params: {
        studentId: student.id.toString(),
        maxPoints: maxRequiredPoints.toString(),
      },
    });
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const StudentCard = ({ student }: { student: User }) => {
    const totalPoints = getStudentPoints(student.id);
    const activities = getStudentActivities(student.id);

    return (
      <TouchableOpacity
        className={`mb-3 p-4 rounded-xl ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-md`}
        onPress={() => handleStudentSelect(student)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mr-3">
              <Ionicons name="person-outline" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {student.name}
              </Text>
              <Text
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {student.username}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text
                  className={`text-xs px-2 py-1 rounded bg-blue-100 text-blue-600`}
                >
                  MAHASISWA
                </Text>
                <View className="flex-row items-center ml-2">
                  <Ionicons name="star-outline" size={12} color="#F59E0B" />
                  <Text
                    className={`text-xs ml-1 font-bold ${
                      isDarkMode ? "text-yellow-400" : "text-yellow-600"
                    }`}
                  >
                    {totalPoints} pts
                  </Text>
                </View>
                <Text
                  className={`text-xs ml-2 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {activities.length}{" "}
                  {language === "EN" ? "activities" : "kegiatan"}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            style={{ flexShrink: 0 }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={language === "EN" ? "SSKM Management" : "Manajemen SSKM"}
          subtitle={
            language === "EN"
              ? "Student Activity Point System"
              : "Sistem Skor Kegiatan Mahasiswa"
          }
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        {/* Search Bar */}
        <View className="px-6 mb-4">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search students..."
            placeholderID="Cari mahasiswa..."
            isDarkMode={isDarkMode}
            language={language}
          />
        </View>

        {/* Max Points Info */}
        <View className="px-6 mb-4">
          <View
            className={`p-3 rounded-xl ${
              isDarkMode ? "bg-blue-900" : "bg-blue-50"
            } border ${isDarkMode ? "border-blue-700" : "border-blue-200"}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#3B82F6"
                />
                <Text
                  className={`ml-2 text-sm ${
                    isDarkMode ? "text-blue-300" : "text-blue-800"
                  }`}
                >
                  {language === "EN"
                    ? `Maximum required activity points: ${maxRequiredPoints} points per student`
                    : `Maksimum poin kegiatan yang dibutuhkan: ${maxRequiredPoints} poin per mahasiswa`}
                </Text>
              </View>
              <TouchableOpacity
                className={`p-2 rounded-lg ml-2 flex-shrink-0 ${
                  isDarkMode ? "bg-blue-700" : "bg-blue-200"
                }`}
                onPress={() => {
                  router.push({
                    pathname: "/admin/pages/EditMaxPointsPage",
                    params: { maxPoints: maxRequiredPoints.toString() },
                  });
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={isDarkMode ? "#93C5FD" : "#1E40AF"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Students List */}
        <View className="px-6 flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`mt-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {language === "EN"
                  ? "Loading students..."
                  : "Memuat mahasiswa..."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              renderItem={({ item }) => <StudentCard student={item} />}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
              ListEmptyComponent={() => (
                <EmptyState
                  icon="people-outline"
                  titleEN="No students found"
                  titleID="Tidak ada mahasiswa yang ditemukan"
                  subtitleEN={
                    searchQuery.trim()
                      ? `No students found for "${searchQuery}"`
                      : "No students are registered in the system"
                  }
                  subtitleID={
                    searchQuery.trim()
                      ? `Tidak ada mahasiswa untuk "${searchQuery}"`
                      : "Tidak ada mahasiswa yang terdaftar dalam sistem"
                  }
                  isDarkMode={isDarkMode}
                  language={language}
                  containerStyle={{ paddingVertical: 80 }}
                />
              )}
            />
          )}
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteConfirm}
        title={language === "EN" ? "Delete Activity?" : "Hapus Kegiatan?"}
        itemName={selectedActivity?.activity_name || ""}
        isDarkMode={isDarkMode}
        language={language}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedActivity(null);
        }}
        onConfirm={handleDeleteActivity}
        isLoading={isDeleting}
      />
    </SafeAreaViewComponent>
  );
}
