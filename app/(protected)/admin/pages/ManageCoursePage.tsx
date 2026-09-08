import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useTimezone } from "@/hooks/useTimezone";
import {
    createCourse,
    deleteCourse,
    getCourses,
    toggleCourseStatus,
    updateCourse,
} from "@/services/api";
import { Course } from "@/types/course";
import { formatDate } from "@/utils/dateUtils";
import { getActiveStatusColor } from "@/utils/statusUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function ManageCourseTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { timezoneInfo } = useTimezone();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [togglingCourse, setTogglingCourse] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();

  // Function to fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCourses();
      if (response.success && response.data) {
        setCourses(response.data);
      } else {
        setCourses([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      // Check for network error
      if (
        error.code === "NETWORK_ERROR" ||
        error.code === "ECONNABORTED" ||
        !error.response
      ) {
        showToast(
          language === "EN"
            ? "Network error. Please check your internet connection."
            : "Error jaringan. Silakan periksa koneksi internet Anda.",
          "error",
        );
      } else {
        showToast(
          language === "EN"
            ? "Failed to load courses"
            : "Gagal memuat mata kuliah",
          "error",
        );
      }
      setCourses([]);
      setLoading(false);
    }
  }, [language, showToast]);

  // Register refresh function
  useEffect(() => {
    registerRefreshFunction("manageCourses", fetchCourses);
    return () => {
      unregisterRefreshFunction("manageCourses");
    };
  }, [registerRefreshFunction, unregisterRefreshFunction, fetchCourses]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  }, [fetchCourses]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      await deleteCourse(courseToDelete.id);

      setCourses(courses.filter((c) => c.id !== courseToDelete.id));

      showToast(
        language === "EN"
          ? "Course deleted successfully"
          : "Mata kuliah berhasil dihapus",
        "success",
      );

      setShowDeleteModal(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      showToast(
        language === "EN"
          ? "Failed to delete course"
          : "Gagal menghapus mata kuliah",
        "error",
      );
    }
  };

  const handleCourseAdded = async (newCourse: any) => {
    try {
      const response = await createCourse({
        ...newCourse,
        is_active: true,
      });

      if (response.success && response.data) {
        setCourses([...courses, response.data]);
      }
    } catch (error) {
      console.error("Error adding course:", error);
      showToast(
        language === "EN"
          ? "Failed to add course"
          : "Gagal menambah mata kuliah",
        "error",
      );
    }
  };

  const handleCourseUpdated = async (updatedCourse: Course) => {
    try {
      const response = await updateCourse(updatedCourse.id, updatedCourse);

      if (response.success && response.data) {
        setCourses(
          courses.map((course) =>
            course.id === updatedCourse.id ? response.data : course,
          ),
        );
      }
    } catch (error) {
      console.error("Error updating course:", error);
      showToast(
        language === "EN"
          ? "Failed to update course"
          : "Gagal memperbarui mata kuliah",
        "error",
      );
    }
  };

  const handleToggleStatus = async (
    courseId: number,
    currentStatus: boolean,
  ) => {
    const newStatus = !currentStatus;

    try {
      // Set loading state
      setTogglingCourse(courseId);

      // Update UI immediately for better UX
      setCourses((prev) =>
        prev.map((item) =>
          item.id === courseId ? { ...item, is_active: newStatus } : item,
        ),
      );

      await toggleCourseStatus(courseId);
      showToast(
        language === "EN"
          ? `Course ${newStatus ? "activated" : "deactivated"} successfully`
          : `Mata kuliah ${newStatus ? "diaktifkan" : "dinonaktifkan"} berhasil`,
        "success",
      );
    } catch (error) {
      // Revert UI change if database update fails
      setCourses((prev) =>
        prev.map((item) =>
          item.id === courseId ? { ...item, is_active: currentStatus } : item,
        ),
      );

      showToast(
        language === "EN"
          ? "Failed to update course status"
          : "Gagal memperbarui status mata kuliah",
        "error",
      );
    } finally {
      // Clear loading state
      setTogglingCourse(null);
    }
  };

  const openEditCourse = (course: Course) => {
    router.push({
      pathname: "/admin/pages/EditCoursePage",
      params: { courseId: course.id.toString() },
    });
  };

  const handleAddCourse = () => {
    router.push("/admin/pages/AddCoursePage");
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.nama_matkul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.kode_matkul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.jurusan.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View
      className={`p-4 mb-3 rounded-lg border ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      } ${!item.is_active ? "opacity-75" : ""}`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row gap-2 mb-2">
            <View
              className={`px-2 py-1 rounded-lg ${getActiveStatusColor(item.is_active, isDarkMode)}`}
            >
              <Text className="text-xs font-semibold text-white">
                {item.is_active
                  ? language === "EN"
                    ? "ACTIVE"
                    : "AKTIF"
                  : language === "EN"
                    ? "INACTIVE"
                    : "TIDAK AKTIF"}
              </Text>
            </View>
          </View>
          <Text
            className={`font-bold text-lg mb-1 ${
              isDarkMode ? "text-white" : "text-gray-800"
            } ${!item.is_active ? "opacity-60" : ""}`}
          >
            {item.nama_matkul}
          </Text>
          <Text
            className={`text-sm mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } ${!item.is_active ? "opacity-50" : ""}`}
          >
            {item.kode_matkul} • {item.sks} SKS
          </Text>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } ${!item.is_active ? "opacity-50" : ""}`}
          >
            {language === "EN" ? "Semester" : "Semester"} {item.semester} •{" "}
            {item.jurusan}
          </Text>
          {(item.hari || item.start_time || item.end_time) && (
            <Text
              className={`text-sm mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } ${!item.is_active ? "opacity-50" : ""}`}
            >
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />{" "}
              {item.hari || "-"}
              {item.start_time && item.end_time && (
                <>
                  {" • "}
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  />{" "}
                  {item.start_time} - {item.end_time}
                </>
              )}
            </Text>
          )}
          {item.dosen_pengajar && (
            <Text
              className={`text-sm mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              } ${!item.is_active ? "opacity-50" : ""}`}
            >
              <Ionicons
                name="person-outline"
                size={12}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />{" "}
              {language === "EN" ? "Lecturer" : "Dosen"}: {item.dosen_pengajar}
            </Text>
          )}
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleToggleStatus(item.id, item.is_active)}
            className={`px-2 py-1 rounded ${
              item.is_active ? "bg-green-500" : "bg-gray-400"
            } ${togglingCourse === item.id ? "opacity-50" : ""}`}
            disabled={togglingCourse === item.id}
          >
            {togglingCourse === item.id ? (
              <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Ionicons
                name={item.is_active ? "eye" : "eye-off"}
                size={16}
                color="white"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Info */}
      <View className="space-y-2 mb-4">
        <View className="flex-row items-center">
          <Ionicons
            name="book-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {item.kode_matkul}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {formatDate(item.created_at, timezoneInfo.timezone)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 bg-blue-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => openEditCourse(item)}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text className="ml-1 text-white text-sm font-medium">
            {language === "EN" ? "Edit" : "Ubah"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => handleDeleteCourse(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text className="ml-1 text-white text-sm font-medium">
            {language === "EN" ? "Delete" : "Hapus"}
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
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Header */}
        <Header
          title={language === "EN" ? "Manage Courses" : "Kelola Mata Kuliah"}
          subtitle={
            language === "EN"
              ? "View, edit, and delete courses"
              : "Lihat, edit, dan hapus mata kuliah"
          }
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        {/* Content */}
        <View className="flex-1 px-6 pt-4">
          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search courses..."
            placeholderID="Cari mata kuliah..."
            isDarkMode={isDarkMode}
            language={language}
            containerStyle={{ marginBottom: 16 }}
          />

          {/* Add Course Button */}
          <TouchableOpacity
            onPress={handleAddCourse}
            className="flex-row items-center justify-center p-4 rounded-lg mb-4 bg-blue-500"
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="ml-2 text-white font-semibold">
              {language === "EN" ? "Add Course" : "Tambah Mata Kuliah"}
            </Text>
          </TouchableOpacity>

          {/* Course List */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <Text
                className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                {language === "EN" ? "Loading..." : "Memuat..."}
              </Text>
            </View>
          ) : filteredCourses.length === 0 ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
            >
              <EmptyState
                icon="book-outline"
                titleEN={
                  searchQuery ? "No courses found" : "No courses available"
                }
                titleID={
                  searchQuery
                    ? "Tidak ada mata kuliah yang ditemukan"
                    : "Tidak ada mata kuliah tersedia"
                }
                subtitleEN={
                  searchQuery
                    ? `No courses found for "${searchQuery}"`
                    : "No courses have been added to the system yet"
                }
                subtitleID={
                  searchQuery
                    ? `Tidak ada mata kuliah untuk "${searchQuery}"`
                    : "Belum ada mata kuliah yang ditambahkan ke sistem"
                }
                isDarkMode={isDarkMode}
                language={language}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={filteredCourses}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderCourseItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        title={language === "EN" ? "Delete Course?" : "Hapus Mata Kuliah?"}
        message={
          language === "EN"
            ? `Are you sure you want to delete "${courseToDelete?.nama_matkul}"?`
            : `Apakah Anda yakin ingin menghapus "${courseToDelete?.nama_matkul}"?`
        }
        warningText={
          language === "EN"
            ? "This action cannot be undone."
            : "Tindakan ini tidak dapat dibatalkan."
        }
        itemName={courseToDelete?.nama_matkul || ""}
        isDarkMode={isDarkMode}
        language={language}
        onCancel={() => {
          setShowDeleteModal(false);
          setCourseToDelete(null);
        }}
        onConfirm={confirmDeleteCourse}
      />
    </SafeAreaViewComponent>
  );
}
