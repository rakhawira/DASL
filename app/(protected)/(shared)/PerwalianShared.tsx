import ConfirmationModal from "@/components/ConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import ToggleSwitch from "@/components/ToggleSwitch";
import { useTimezone } from "@/hooks/useTimezone";
import {
  createPerwalianCourse,
  deletePerwalianCourse,
  getCourses,
  getPerwalianCourses,
  getPerwalianStatus,
  updatePerwalianCourseStatus,
  updatePerwalianStatus,
} from "@/services/api";
import { Course } from "@/types/course";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface GuidanceSession {
  id: string;
  studentName: string;
  studentNim: string;
  date: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface PerwalianCourseItem {
  id: number;
  user_id: number;
  course_id: number;
  status: string;
  requested_at: string;
  approved_at?: string;
  approved_by?: number;
  approver_name?: string;
  course?: {
    id: number;
    kode_matkul: string;
    nama_matkul: string;
    sks: number;
    dosen_pengajar: string;
    hari?: string;
    room?: string;
    start_time?: string;
    end_time?: string;
  };
  user?: {
    id: number;
    name: string;
    nim?: string;
    jurusan?: string;
  };
}

interface PerwalianSharedProps {
  user?: any;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
  isLecturer?: boolean;
  isDosenWali?: boolean;
  onClose?: () => void;
}

const STATUS_COLORS = {
  scheduled: { bg: "bg-blue-500", text: "text-white" },
  completed: { bg: "bg-green-500", text: "text-white" },
  cancelled: { bg: "bg-red-500", text: "text-white" },
};

const STATUS_LABELS_EN = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_LABELS_ID = {
  scheduled: "Dijadwalkan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function PerwalianShared({
  user,
  isDarkMode,
  language,
  showToast,
  isLecturer = false,
  isDosenWali = false,
  onClose,
}: PerwalianSharedProps) {
  const { timezoneInfo } = useTimezone();
  const [sessions, setSessions] = useState<GuidanceSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Course selection state (for user only) - Multi-select with checkbox
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showCourseSelection, setShowCourseSelection] = useState(!isLecturer);

  // Confirmation modal state (for user only)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [existingRequests, setExistingRequests] = useState<any[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Lecturer (Dosen Wali) state
  const [perwalianCourses, setPerwalianCourses] = useState<
    PerwalianCourseItem[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Admin toggle state (for admin only)
  const [acceptPerwalianRequests, setAcceptPerwalianRequests] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Prepare items for ConfirmationModal
  const confirmationItems = selectedCourses.map((course) => ({
    id: course.id,
    title: course.nama_matkul,
    subtitle: `${course.kode_matkul} • ${course.dosen_pengajar}`,
  }));

  // Calculate total SKS from selected courses
  const totalSKS = selectedCourses.reduce(
    (sum, course) => sum + (course.sks || 0),
    0,
  );

  useEffect(() => {
    if (isLecturer) {
      loadPerwalianCoursesForLecturer();
      // Load perwalian status for admin (when isDosenWali is also true, it's admin)
      if (user?.role === "admin") {
        loadPerwalianSetting();
      }
    } else {
      // For user, load courses first
      loadCourses();
    }
  }, [user?.username, isLecturer, user?.role]);

  // Load perwalian setting (for admin)
  const loadPerwalianSetting = async () => {
    try {
      const response = await getPerwalianStatus();
      if (response.success && response.data) {
        setAcceptPerwalianRequests(response.data.status);
      }
    } catch (error) {
      console.error("Error loading perwalian setting:", error);
    }
  };

  // Handle perwalian toggle (for admin)
  const handlePerwalianToggle = async (value: boolean) => {
    setToggleLoading(true);
    try {
      const response = await updatePerwalianStatus(value);
      if (response.success) {
        setAcceptPerwalianRequests(value);
        showToast(
          language === "EN"
            ? `Perwalian requests ${value ? "enabled" : "disabled"}`
            : `Permohonan perwalian ${value ? "dibuka" : "ditutup"}`,
          "success",
        );
      } else {
        throw new Error("Failed to update perwalian status");
      }
    } catch (error) {
      console.error("Error updating perwalian status:", error);
      showToast(
        language === "EN"
          ? "Failed to update perwalian status"
          : "Gagal memperbarui status perwalian",
        "error",
      );
    } finally {
      setToggleLoading(false);
    }
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const response = await getCourses();
      if (response.success && response.data) {
        // Filter only active courses that match user's jurusan
        const userJurusan = user?.jurusan;
        const filteredCourses = response.data.filter(
          (course: Course) =>
            course.is_active &&
            (!userJurusan || course.jurusan === userJurusan),
        );
        setCourses(filteredCourses);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      showToast(
        language === "EN"
          ? "Failed to load courses"
          : "Gagal memuat mata kuliah",
        "error",
      );
    } finally {
      setCoursesLoading(false);
      setLoading(false);
    }
  };

  const handleToggleCourseSelection = (course: Course) => {
    setSelectedCourses((prev) => {
      const isSelected = prev.some((c) => c.id === course.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== course.id);
      } else {
        return [...prev, course];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses([...courses]);
    }
  };

  const handleProceedToRequest = () => {
    if (selectedCourses.length === 0) {
      showToast(
        language === "EN"
          ? "Please select at least one course"
          : "Silakan pilih minimal satu mata kuliah",
        "error",
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const handleBackToCourses = () => {
    setShowCourseSelection(true);
    setExistingRequests([]);
  };

  const loadPerwalianData = async () => {
    setLoading(true);
    try {
      // Fetch existing perwalian requests for this user
      const response = await getPerwalianCourses(user?.id);
      if (response.success && response.data) {
        // Get all requests for selected courses
        const courseIds = selectedCourses.map((c) => c.id);
        const courseRequests = response.data.filter((req: any) =>
          courseIds.includes(req.course_id),
        );
        setExistingRequests(courseRequests);

        // Convert to GuidanceSession format
        const sessionsData: GuidanceSession[] = courseRequests.map(
          (req: any) => {
            // Convert timezone abbreviation to IANA format
            const tz = timezoneInfo.timezone.toLowerCase();
            let timeZone = timezoneInfo.timezone;
            if (tz === "wib") timeZone = "Asia/Jakarta";
            else if (tz === "wita") timeZone = "Asia/Makassar";
            else if (tz === "wit") timeZone = "Asia/Jayapura";

            return {
              id: req.id.toString(),
              studentName: user?.name || "Mahasiswa",
              studentNim: user?.username || "-",
              date: new Date(req.requested_at).toLocaleDateString(
                language === "EN" ? "en-US" : "id-ID",
                { timeZone: timeZone },
              ),
              status:
                req.status === "pending"
                  ? "scheduled"
                  : req.status === "approved"
                    ? "scheduled"
                    : req.status === "completed"
                      ? "completed"
                      : "cancelled",
            };
          },
        );
        setSessions(sessionsData);
      } else {
        setSessions([]);
        setExistingRequests([]);
      }
    } catch (error) {
      console.error("Error loading perwalian data:", error);
      setSessions([]);
      setExistingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionsForCourse = async () => {
    // Load perwalian data for all selected courses
    await loadPerwalianData();
  };

  // Load perwalian courses for lecturer (Dosen Wali)
  const loadPerwalianCoursesForLecturer = async () => {
    setLoading(true);
    try {
      const response = await getPerwalianCourses();
      if (response.success && response.data) {
        setPerwalianCourses(response.data);
      } else {
        setPerwalianCourses([]);
      }
    } catch (error) {
      console.error("Error loading perwalian courses for lecturer:", error);
      showToast(
        language === "EN"
          ? "Failed to load perwalian courses"
          : "Gagal memuat data perwalian",
        "error",
      );
      setPerwalianCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle approve/reject perwalian course
  const handleUpdateStatus = async (id: number, status: string) => {
    setProcessingId(id);
    try {
      const response = await updatePerwalianCourseStatus(id, status, {
        approved_by: user?.id,
      });

      if (response.success) {
        showToast(
          language === "EN"
            ? `Course ${status} successfully`
            : `Mata kuliah berhasil di${status === "approved" ? "setujui" : "tolak"}`,
          "success",
        );
        // Refresh the list
        await loadPerwalianCoursesForLecturer();
      } else {
        showToast(
          language === "EN"
            ? "Failed to update status"
            : "Gagal mengubah status",
          "error",
        );
      }
    } catch (error) {
      console.error("Error updating perwalian status:", error);
      showToast(
        language === "EN" ? "Failed to update status" : "Gagal mengubah status",
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Handle delete perwalian course
  const handleDeletePerwalian = async (id: number) => {
    Alert.alert(
      language === "EN" ? "Delete Request" : "Hapus Permintaan",
      language === "EN"
        ? "Are you sure you want to delete this perwalian request?"
        : "Apakah Anda yakin ingin menghapus permintaan perwalian ini?",
      [
        {
          text: language === "EN" ? "Cancel" : "Batal",
          style: "cancel",
        },
        {
          text: language === "EN" ? "Delete" : "Hapus",
          style: "destructive",
          onPress: async () => {
            setProcessingId(id);
            try {
              const response = await deletePerwalianCourse(id);
              if (response.success) {
                showToast(
                  language === "EN"
                    ? "Request deleted successfully"
                    : "Permintaan berhasil dihapus",
                  "success",
                );
                await loadPerwalianCoursesForLecturer();
              } else {
                showToast(
                  language === "EN"
                    ? "Failed to delete request"
                    : "Gagal menghapus permintaan",
                  "error",
                );
              }
            } catch (error) {
              console.error("Error deleting perwalian:", error);
              showToast(
                language === "EN"
                  ? "Failed to delete request"
                  : "Gagal menghapus permintaan",
                "error",
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  // Filter perwalian courses by status and search query
  const filteredPerwalianCourses = perwalianCourses.filter((item) => {
    // Filter by status
    if (selectedStatus && item.status !== selectedStatus) {
      return false;
    }
    // Filter by search query (student name or course name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const studentName = item.user?.name?.toLowerCase() || "";
      const courseName = item.course?.nama_matkul?.toLowerCase() || "";
      const kodeMatkul = item.course?.kode_matkul?.toLowerCase() || "";
      return (
        studentName.includes(query) ||
        courseName.includes(query) ||
        kodeMatkul.includes(query)
      );
    }
    return true;
  });

  // Group perwalian courses by student
  const groupedByStudent = filteredPerwalianCourses.reduce(
    (acc, item) => {
      if (!item.user) return acc;
      const key = item.user_id;
      if (!acc[key]) {
        acc[key] = {
          user: item.user,
          courses: [],
        };
      }
      acc[key].courses.push(item);
      return acc;
    },
    {} as Record<
      number,
      { user: PerwalianCourseItem["user"]; courses: PerwalianCourseItem[] }
    >,
  );

  const loadSessions = async () => {
    setLoading(true);
    try {
      // For lecturer: fetch all perwalian requests (to be implemented with proper API)
      // For now, show empty state
      setSessions([]);
    } catch (error) {
      console.error("Error loading sessions:", error);
      showToast(
        language === "EN"
          ? "Failed to load perwalian sessions"
          : "Gagal memuat sesi perwalian",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (showCourseSelection && !isLecturer) {
      await loadCourses();
    } else if (isLecturer) {
      await loadPerwalianCoursesForLecturer();
    } else {
      await loadSessions();
    }
    setRefreshing(false);
  };

  const handleAddSession = () => {
    if (!isLecturer && selectedCourses.length === 0) {
      setShowCourseSelection(true);
      return;
    }
    // Open confirmation modal for user with selected courses
    if (!isLecturer && selectedCourses.length > 0) {
      setShowConfirmModal(true);
      return;
    }
    // For lecturer - coming soon
    showToast(
      language === "EN"
        ? "Add session feature coming soon"
        : "Fitur tambah sesi segera hadir",
      "info",
    );
  };

  const handleConfirmSubmit = async () => {
    if (selectedCourses.length === 0 || !user?.id) {
      showToast(
        language === "EN"
          ? "Please select at least one course"
          : "Silakan pilih minimal satu mata kuliah",
        "error",
      );
      return;
    }

    // Check for each course if there's already a pending request
    const hasPendingRequests = selectedCourses.filter((course) =>
      existingRequests.some(
        (req) => req.course_id === course.id && req.status === "pending",
      ),
    );

    if (hasPendingRequests.length > 0) {
      const courseNames = hasPendingRequests
        .map((c) => c.nama_matkul)
        .join(", ");
      showToast(
        language === "EN"
          ? `You already have pending requests for: ${courseNames}`
          : `Anda sudah memiliki permintaan tertunda untuk: ${courseNames}`,
        "error",
      );
      return;
    }

    setBatchSubmitting(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Submit for each selected course
      for (const course of selectedCourses) {
        try {
          const response = await createPerwalianCourse({
            user_id: user.id,
            course_id: course.id,
          });

          if (response.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error: any) {
          console.error(`Error submitting for course ${course.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(
          language === "EN"
            ? `${successCount} perwalian request(s) submitted successfully${failCount > 0 ? `, ${failCount} failed` : ""}`
            : `${successCount} permintaan perwalian berhasil diajukan${failCount > 0 ? `, ${failCount} gagal` : ""}`,
          successCount === selectedCourses.length ? "success" : "info",
        );
        // Close modal and reset
        setShowConfirmModal(false);
        setSelectedCourses([]);
        setShowCourseSelection(true);
      } else {
        showToast(
          language === "EN"
            ? "Failed to submit all requests"
            : "Gagal mengajukan semua permintaan",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error submitting perwalian requests:", error);
      showToast(
        language === "EN"
          ? "Failed to submit requests"
          : "Gagal mengajukan permintaan",
        "error",
      );
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
  };

  const handleCancelConfirmModal = () => {
    setShowConfirmModal(false);
  };

  const renderCourseItem = ({ item }: { item: Course }) => {
    const isSelected = selectedCourses.some((c) => c.id === item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleToggleCourseSelection(item)}
        className={`p-4 rounded-xl mb-3 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-sm border ${
          isSelected
            ? "border-red-500"
            : isDarkMode
              ? "border-gray-700"
              : "border-gray-200"
        }`}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            {/* Checkbox above course name */}
            <View
              className={`w-6 h-6 rounded-md mb-2 border-2 items-center justify-center ${
                isSelected
                  ? "bg-red-500 border-red-500"
                  : isDarkMode
                    ? "border-gray-600"
                    : "border-gray-400"
              }`}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text
              className={`font-semibold text-lg ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {item.nama_matkul}
            </Text>
            <Text
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {item.kode_matkul} • {item.sks} SKS
            </Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${
              item.is_active ? "bg-green-500" : "bg-gray-500"
            }`}
          >
            <Text className="text-xs font-medium text-white">
              {item.is_active
                ? language === "EN"
                  ? "Active"
                  : "Aktif"
                : language === "EN"
                  ? "Inactive"
                  : "Nonaktif"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-2">
          <Ionicons
            name="business-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`text-sm ml-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {item.jurusan}
          </Text>
        </View>

        {item.dosen_pengajar && (
          <View className="flex-row items-center">
            <Ionicons
              name="person-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`text-sm ml-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {item.dosen_pengajar}
            </Text>
          </View>
        )}

        {(item.hari || item.room) && (
          <View className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={14}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`text-xs ml-2 ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {item.hari}
                {item.start_time && item.end_time
                  ? `, ${item.start_time} - ${item.end_time}`
                  : ""}
                {item.room ? ` • ${item.room}` : ""}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredSessions = selectedStatus
    ? sessions.filter((s) => s.status === selectedStatus)
    : sessions;

  const renderSessionItem = ({ item }: { item: GuidanceSession }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`p-4 rounded-xl mb-3 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text
            className={`font-semibold text-lg ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {isLecturer ? item.studentName : "Perwalian Request"}
          </Text>
          {isLecturer && (
            <Text
              className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {item.studentNim}
            </Text>
          )}
        </View>
        <View
          className={`px-3 py-1 rounded-full ${STATUS_COLORS[item.status].bg}`}
        >
          <Text
            className={`text-xs font-medium ${STATUS_COLORS[item.status].text}`}
          >
            {language === "EN"
              ? STATUS_LABELS_EN[item.status]
              : STATUS_LABELS_ID[item.status]}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <Ionicons
          name="calendar-outline"
          size={16}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
        <Text
          className={`text-sm ml-2 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {item.date}
        </Text>
      </View>

      <View className="flex-row items-center">
        <Ionicons
          name="chatbubble-outline"
          size={16}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
        <Text
          className={`text-sm ml-2 ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Course ID: {item.id}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filterButtons = isLecturer
    ? [
        { key: null, labelEN: "All", labelID: "Semua" },
        { key: "pending", labelEN: "Pending", labelID: "Menunggu" },
        { key: "approved", labelEN: "Approved", labelID: "Disetujui" },
        { key: "rejected", labelEN: "Rejected", labelID: "Ditolak" },
      ]
    : [
        { key: null, labelEN: "All", labelID: "Semua" },
        { key: "scheduled", labelEN: "Scheduled", labelID: "Dijadwalkan" },
        { key: "completed", labelEN: "Completed", labelID: "Selesai" },
      ];

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={
            showCourseSelection && !isLecturer
              ? language === "EN"
                ? "Select Course"
                : "Pilih Mata Kuliah"
              : "Perwalian"
          }
          subtitle={
            showCourseSelection && !isLecturer
              ? language === "EN"
                ? `${selectedCourses.length} course(s) selected • ${totalSKS} SKS`
                : `${selectedCourses.length} mata kuliah terpilih • ${totalSKS} SKS`
              : selectedCourses.length > 0 && !isLecturer
                ? `${selectedCourses.length} course(s) • ${totalSKS} SKS`
                : isLecturer
                  ? language === "EN"
                    ? "Manage student perwalian sessions"
                    : "Kelola sesi perwalian mahasiswa"
                  : language === "EN"
                    ? "View your perwalian sessions"
                    : "Lihat sesi perwalian Anda"
          }
          onBack={
            showCourseSelection && !isLecturer
              ? onClose
              : selectedCourses.length > 0 && !isLecturer
                ? handleBackToCourses
                : onClose
          }
          isDarkMode={isDarkMode}
        />

        {/* Admin Toggle for Perwalian Status (Admin only) */}
        {isLecturer && user?.role === "admin" && !showCourseSelection && (
          <View className="px-6 py-4">
            <View
              className={`rounded-xl p-4 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-sm border ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text
                    className={`font-bold text-base ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {language === "EN"
                      ? "Accept Perwalian Requests"
                      : "Terima Permohonan Perwalian"}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN"
                      ? "Toggle to open/close perwalian requests from students"
                      : "Aktifkan untuk membuka/menutup permohonan perwalian dari mahasiswa"}
                  </Text>
                </View>
                <ToggleSwitch
                  value={acceptPerwalianRequests}
                  onValueChange={handlePerwalianToggle}
                  leftLabel=""
                  rightLabel=""
                  activeColor="bg-red-500"
                  inactiveColor="bg-gray-300"
                />
              </View>
            </View>
          </View>
        )}

        {/* Course Selection or Filter Buttons */}
        {!showCourseSelection && (
          <View className="px-6 py-4">
            <View className="flex-row gap-2 flex-wrap">
              {filterButtons.map((filter) => {
                const isActive = selectedStatus === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key ?? "all"}
                    onPress={() => setSelectedStatus(filter.key)}
                    className={`py-2 px-4 rounded-lg ${
                      isActive
                        ? "bg-red-500"
                        : isDarkMode
                          ? "bg-gray-800 border border-gray-700"
                          : "bg-white border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isActive
                          ? "text-white"
                          : isDarkMode
                            ? "text-gray-300"
                            : "text-gray-600"
                      }`}
                    >
                      {language === "EN" ? filter.labelEN : filter.labelID}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Search Bar for Lecturer */}
        {isLecturer && !showCourseSelection && (
          <View className="px-6 mb-4">
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderEN="Search student or course..."
              placeholderID="Cari mahasiswa atau mata kuliah..."
              isDarkMode={isDarkMode}
              language={language}
            />
          </View>
        )}

        {/* Course Selection List (User only) */}
        {showCourseSelection && !isLecturer && (
          <>
            {coursesLoading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#EF4444" />
                <Text
                  className={`mt-4 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {language === "EN"
                    ? "Loading courses..."
                    : "Memuat mata kuliah..."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={courses}
                renderItem={renderCourseItem}
                keyExtractor={(item) => item.id.toString()}
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#EF4444"
                    colors={["#EF4444"]}
                  />
                }
                ListEmptyComponent={() => (
                  <EmptyState
                    icon="book-outline"
                    titleEN="No courses available"
                    titleID="Tidak ada mata kuliah"
                    subtitleEN="No active courses found for your department"
                    subtitleID="Tidak ada mata kuliah aktif untuk jurusan Anda"
                    isDarkMode={isDarkMode}
                    language={language}
                  />
                )}
              />
            )}

            {/* Add to List Button (User only during course selection) */}
            {selectedCourses.length > 0 && (
              <View className="absolute bottom-6 left-6 right-6">
                <TouchableOpacity
                  onPress={handleProceedToRequest}
                  className="py-4 rounded-xl bg-red-500 items-center justify-center shadow-lg"
                  style={{
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    {language === "EN"
                      ? `Add ${selectedCourses.length} Course(s) • ${totalSKS} SKS`
                      : `Tambahkan ${selectedCourses.length} MK • ${totalSKS} SKS`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Sessions List / Perwalian Courses List */}
        {!showCourseSelection && (
          <>
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#EF4444" />
                <Text
                  className={`mt-4 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {language === "EN" ? "Loading..." : "Memuat..."}
                </Text>
              </View>
            ) : isLecturer ? (
              // Lecturer View - Grouped by Student
              <FlatList
                data={Object.entries(groupedByStudent)}
                keyExtractor={([userId]) => userId}
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#EF4444"
                    colors={["#EF4444"]}
                  />
                }
                renderItem={({ item: [userId, group] }) => (
                  <View className="mb-6">
                    {/* Student Header */}
                    <View
                      className={`p-4 rounded-t-xl ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-lg ${
                          isDarkMode ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {group.user?.name}
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {group.user?.nim} • {group.user?.jurusan}
                      </Text>
                    </View>

                    {/* Courses List */}
                    <View
                      className={`rounded-b-xl ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      } border ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      }`}
                    >
                      {group.courses.map((item, index) => (
                        <View
                          key={item.id}
                          className={`p-4 ${
                            index !== group.courses.length - 1
                              ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`
                              : ""
                          }`}
                        >
                          <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                              <Text
                                className={`font-semibold ${
                                  isDarkMode ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {item.course?.nama_matkul}
                              </Text>
                              <Text
                                className={`text-sm ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {item.course?.kode_matkul} • {item.course?.sks}{" "}
                                SKS
                              </Text>
                              {item.course?.dosen_pengajar && (
                                <Text
                                  className={`text-xs ${
                                    isDarkMode
                                      ? "text-gray-500"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {item.course?.dosen_pengajar}
                                </Text>
                              )}
                            </View>
                            <View
                              className={`px-3 py-1 rounded-full ${
                                item.status === "approved"
                                  ? "bg-green-500"
                                  : item.status === "rejected"
                                    ? "bg-red-500"
                                    : item.status === "pending"
                                      ? "bg-yellow-500"
                                      : "bg-gray-500"
                              }`}
                            >
                              <Text className="text-xs font-medium text-white">
                                {item.status.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          {/* Schedule Info */}
                          {(item.course?.hari || item.course?.room) && (
                            <View className="flex-row items-center mb-3">
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                              />
                              <Text
                                className={`text-xs ml-2 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {item.course?.hari}
                                {item.course?.start_time &&
                                  ` ${item.course.start_time}-${item.course.end_time}`}
                                {item.course?.room && ` • ${item.course.room}`}
                              </Text>
                            </View>
                          )}

                          {/* Action Buttons for Pending */}
                          {item.status === "pending" && (
                            <View className="flex-row gap-2 mt-2">
                              <TouchableOpacity
                                onPress={() =>
                                  handleUpdateStatus(item.id, "approved")
                                }
                                disabled={processingId === item.id}
                                className={`flex-1 py-2 rounded-lg items-center ${
                                  processingId === item.id
                                    ? "bg-gray-400"
                                    : "bg-green-500"
                                }`}
                              >
                                {processingId === item.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                  />
                                ) : (
                                  <Text className="text-white font-medium text-sm">
                                    {language === "EN" ? "Approve" : "Setujui"}
                                  </Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() =>
                                  handleUpdateStatus(item.id, "rejected")
                                }
                                disabled={processingId === item.id}
                                className={`flex-1 py-2 rounded-lg items-center ${
                                  processingId === item.id
                                    ? "bg-gray-400"
                                    : "bg-red-500"
                                }`}
                              >
                                {processingId === item.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                  />
                                ) : (
                                  <Text className="text-white font-medium text-sm">
                                    {language === "EN" ? "Reject" : "Tolak"}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* Delete Button for Approved/Rejected */}
                          {(item.status === "approved" ||
                            item.status === "rejected") && (
                            <TouchableOpacity
                              onPress={() => handleDeletePerwalian(item.id)}
                              disabled={processingId === item.id}
                              className="mt-2 py-2 rounded-lg items-center bg-gray-500"
                            >
                              {processingId === item.id ? (
                                <ActivityIndicator size="small" color="white" />
                              ) : (
                                <Text className="text-white font-medium text-sm">
                                  {language === "EN" ? "Remove" : "Hapus"}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                ListEmptyComponent={() => (
                  <EmptyState
                    icon="people-outline"
                    titleEN="No perwalian requests found"
                    titleID="Tidak ada permintaan perwalian"
                    subtitleEN={
                      selectedStatus || searchQuery
                        ? "Try changing the filter or search"
                        : "No perwalian requests yet"
                    }
                    subtitleID={
                      selectedStatus || searchQuery
                        ? "Coba ubah filter atau pencarian"
                        : "Belum ada permintaan perwalian"
                    }
                    isDarkMode={isDarkMode}
                    language={language}
                  />
                )}
              />
            ) : (
              // User View - Sessions List
              <FlatList
                data={filteredSessions}
                renderItem={renderSessionItem}
                keyExtractor={(item) => item.id}
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#EF4444"
                    colors={["#EF4444"]}
                  />
                }
                ListEmptyComponent={() => (
                  <EmptyState
                    icon="people-outline"
                    titleEN="No perwalian sessions found"
                    titleID="Tidak ada sesi perwalian"
                    subtitleEN={
                      selectedStatus
                        ? "Try changing the filter"
                        : "No sessions scheduled yet"
                    }
                    subtitleID={
                      selectedStatus
                        ? "Coba ubah filter"
                        : "Belum ada sesi yang dijadwalkan"
                    }
                    isDarkMode={isDarkMode}
                    language={language}
                  />
                )}
              />
            )}
          </>
        )}

        {/* Add Button (User only after selecting courses) */}
        {!isLecturer && !showCourseSelection && selectedCourses.length > 0 && (
          <TouchableOpacity
            onPress={handleAddSession}
            className="absolute bottom-24 right-6 w-14 h-14 rounded-full bg-red-500 items-center justify-center shadow-lg"
            style={{
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}

        {/* Confirmation Modal (User only) */}
        <ConfirmationModal
          visible={showConfirmModal}
          title={
            language === "EN" ? "Confirm Perwalian" : "Konfirmasi Perwalian"
          }
          message={
            language === "EN"
              ? `Are you sure you want to submit perwalian requests for ${selectedCourses.length} course(s)?`
              : `Apakah Anda yakin ingin mengajukan perwalian untuk ${selectedCourses.length} mata kuliah?`
          }
          items={confirmationItems}
          isDarkMode={isDarkMode}
          language={language}
          onCancel={handleCancelConfirmModal}
          onConfirm={handleConfirmSubmit}
          isLoading={batchSubmitting}
          icon="checkmark-circle-outline"
          iconColor="#22C55E"
          confirmButtonColor="bg-red-500"
          confirmText={language === "EN" ? "Confirm" : "Konfirmasi"}
          cancelText={language === "EN" ? "Cancel" : "Batal"}
        />
      </View>
    </SafeAreaViewComponent>
  );
}

// Export interfaces and utility functions for use in admin PerwalianPage
export { STATUS_COLORS, STATUS_LABELS_EN, STATUS_LABELS_ID };

// Interfaces for admin PerwalianPage
export interface PerwalianCourse {
  id: number;
  user_id: number;
  course_id: number;
  status: string;
  requested_at: string;
  approved_at?: string;
  course?: {
    id: number;
    kode_matkul: string;
    nama_matkul: string;
    sks: number;
    dosen_pengajar: string;
  };
  user?: {
    id: number;
    name: string;
    nim?: string;
  };
}

export interface GroupedPerwalian {
  userId: number;
  userName: string;
  nim?: string;
  courses: PerwalianCourse[];
}

// Utility function to group perwalian data by user - used by admin PerwalianPage
export const groupPerwalianByUser = (
  perwalianData: PerwalianCourse[],
): GroupedPerwalian[] => {
  return perwalianData.reduce((acc: GroupedPerwalian[], item) => {
    if (!item.user) return acc;
    const existingGroup = acc.find((g) => g.userId === item.user_id);
    if (existingGroup) {
      existingGroup.courses.push(item);
    } else {
      acc.push({
        userId: item.user_id,
        userName: item.user.name,
        nim: item.user.nim,
        courses: [item],
      });
    }
    return acc;
  }, []);
};
export type { GuidanceSession };
