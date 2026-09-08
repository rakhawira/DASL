import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import Dropdown from "@/components/Dropdown";
import Header from "@/components/Header";
import { FACULTIES, getMajorsByFaculty } from "@/constants/academicData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useTimezone } from "@/hooks/useTimezone";
import { getCourseById, getUsers, updateCourse } from "@/services/api";
import { Course, UpdateCourse } from "@/types/course";
import { SEMESTER_OPTIONS, SKS_OPTIONS } from "@/types/dropdown";
import { User } from "@/types/user";
import { formatDate } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function EditCourseTab() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { timezoneInfo } = useTimezone();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateCourse>({
    kode_matkul: "",
    nama_matkul: "",
    sks: 0,
    semester: "",
    jurusan: "",
    fakultas: "",
    dosen_pengajar: "",
    hari: "",
    room: "",
    start_time: "",
    end_time: "",
  });

  // Separate state for input fields to handle empty strings
  const [sksInput, setSksInput] = useState("");
  const [showSksDropdown, setShowSksDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showLecturerDropdown, setShowLecturerDropdown] = useState(false);
  const [showHariDropdown, setShowHariDropdown] = useState(false);

  // State untuk tracking nilai sementara saat dropdown dibuka
  const [tempFaculty, setTempFaculty] = useState("");
  const [tempDepartment, setTempDepartment] = useState("");
  const [tempLecturer, setTempLecturer] = useState("");
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [loadingLecturers, setLoadingLecturers] = useState(false);

  // Time picker states
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");

  // Parse time from course when loaded
  useEffect(() => {
    if (course) {
      const parseTime = (time: string) => {
        if (!time || !time.includes(":")) return { hour: "", minute: "" };
        const [h, m] = time.split(":");
        return { hour: h || "", minute: m || "" };
      };
      const { hour: sHour, minute: sMinute } = parseTime(
        course.start_time || "",
      );
      const { hour: eHour, minute: eMinute } = parseTime(course.end_time || "");
      setStartHour(sHour);
      setStartMinute(sMinute);
      setEndHour(eHour);
      setEndMinute(eMinute);
    }
  }, [course]);

  // Fetch course data on mount
  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourseById(Number(courseId));
      if (response.success && response.data) {
        setCourse(response.data);
      } else {
        showToast(
          language === "EN"
            ? "Failed to load course"
            : "Gagal memuat mata kuliah",
          "error",
        );
        router.back();
      }
    } catch (error) {
      showToast(
        language === "EN" ? "Error loading course" : "Error memuat mata kuliah",
        "error",
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Populate formData when course is loaded
  useEffect(() => {
    if (course) {
      setFormData({
        kode_matkul: course.kode_matkul || "",
        nama_matkul: course.nama_matkul || "",
        sks: course.sks || 0,
        semester: course.semester || "",
        jurusan: course.jurusan || "",
        fakultas: course.fakultas || "",
        dosen_pengajar: course.dosen_pengajar || "",
        hari: course.hari || "",
        room: course.room || "",
        start_time: course.start_time || "",
        end_time: course.end_time || "",
      });
      setSksInput(course.sks?.toString() || "");
    }
  }, [course]);

  const [showStartHourDropdown, setShowStartHourDropdown] = useState(false);
  const [showStartMinuteDropdown, setShowStartMinuteDropdown] = useState(false);
  const [showEndHourDropdown, setShowEndHourDropdown] = useState(false);
  const [showEndMinuteDropdown, setShowEndMinuteDropdown] = useState(false);

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  // Generate minute options (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  // Generate SKS options (1-6)
  const sksOptions = [1, 2, 3, 4, 5, 6];

  // Hari options
  const hariOptions = [
    { value: "Senin", label: { EN: "Monday", ID: "Senin" } },
    { value: "Selasa", label: { EN: "Tuesday", ID: "Selasa" } },
    { value: "Rabu", label: { EN: "Wednesday", ID: "Rabu" } },
    { value: "Kamis", label: { EN: "Thursday", ID: "Kamis" } },
    { value: "Jumat", label: { EN: "Friday", ID: "Jumat" } },
    { value: "Sabtu", label: { EN: "Saturday", ID: "Sabtu" } },
    { value: "Minggu", label: { EN: "Sunday", ID: "Minggu" } },
  ];

  // Static semesters list
  const semesters = [
    {
      value: "ganjil",
      label: {
        EN: "Odd Semester",
        ID: "Semester Ganjil",
      },
    },
    {
      value: "genap",
      label: {
        EN: "Even Semester",
        ID: "Semester Genap",
      },
    },
  ];

  // Static faculties list
  const faculties = FACULTIES;

  // Get current departments based on selected faculty
  const currentDepartments = formData.fakultas
    ? getMajorsByFaculty(formData.fakultas)
    : [];

  // Get current lecturers based on selected department
  const currentLecturers = formData.jurusan
    ? lecturers.filter((lecturer) => lecturer.jurusan === formData.jurusan)
    : [];

  // Fetch lecturers on component mount
  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      setLoadingLecturers(true);
      const response = await getUsers();
      if (response.success && response.data) {
        const lecturerList = response.data.filter(
          (user: User) => user.role === "dosen",
        );
        setLecturers(lecturerList);
      }
    } catch (error) {
      console.error("Error fetching lecturers:", error);
    } finally {
      setLoadingLecturers(false);
    }
  };

  useEffect(() => {
    // Check if form has changes (only if course is loaded)
    if (!course) return;

    const combinedStartTime =
      startHour && startMinute ? `${startHour}:${startMinute}` : "";
    const combinedEndTime =
      endHour && endMinute ? `${endHour}:${endMinute}` : "";

    const hasChanged =
      formData.kode_matkul !== course.kode_matkul ||
      formData.nama_matkul !== course.nama_matkul ||
      formData.sks !== course.sks ||
      formData.semester !== course.semester ||
      formData.jurusan !== course.jurusan ||
      formData.fakultas !== (course.fakultas || "") ||
      formData.dosen_pengajar !== (course.dosen_pengajar || "") ||
      formData.hari !== (course.hari || "") ||
      formData.room !== (course.room || "") ||
      combinedStartTime !== (course.start_time || "") ||
      combinedEndTime !== (course.end_time || "");

    setHasChanges(hasChanged);
  }, [formData, course, startHour, startMinute, endHour, endMinute]);

  const handleUpdateCourse = async () => {
    // Ensure course is loaded before updating
    if (!course) {
      showToast(
        language === "EN"
          ? "Course data not loaded"
          : "Data mata kuliah belum dimuat",
        "error",
      );
      return;
    }

    // Validation
    if (!formData.kode_matkul?.trim()) {
      showToast(
        language === "EN"
          ? "Course code is required"
          : "Kode mata kuliah wajib diisi",
        "error",
      );
      return;
    }

    if (!formData.nama_matkul?.trim()) {
      showToast(
        language === "EN"
          ? "Course name is required"
          : "Nama mata kuliah wajib diisi",
        "error",
      );
      return;
    }

    if (formData.sks && (formData.sks < 1 || formData.sks > 6)) {
      showToast(
        language === "EN"
          ? "SKS must be between 1 and 6"
          : "SKS harus antara 1 dan 6",
        "error",
      );
      return;
    }

    if (!formData.semester?.trim()) {
      showToast(
        language === "EN" ? "Semester is required" : "Semester wajib diisi",
        "error",
      );
      return;
    }

    if (!formData.jurusan?.trim()) {
      showToast(
        language === "EN" ? "Department is required" : "Jurusan wajib diisi",
        "error",
      );
      return;
    }

    try {
      setLoading(true);

      // Combine hour and minute for time fields
      const combinedStartTime =
        startHour && startMinute
          ? `${startHour}:${startMinute}`
          : course.start_time || "";
      const combinedEndTime =
        endHour && endMinute
          ? `${endHour}:${endMinute}`
          : course.end_time || "";

      const response = await updateCourse(course.id, {
        kode_matkul: formData.kode_matkul || course.kode_matkul,
        nama_matkul: formData.nama_matkul || course.nama_matkul,
        sks: parseInt(sksInput) || course.sks,
        semester: formData.semester || course.semester,
        jurusan: formData.jurusan || course.jurusan,
        fakultas: formData.fakultas || course.fakultas,
        dosen_pengajar: formData.dosen_pengajar || course.dosen_pengajar,
        hari: formData.hari || course.hari,
        room: formData.room || course.room,
        start_time: combinedStartTime,
        end_time: combinedEndTime,
      });

      if (response.success && response.data) {
        showToast(
          language === "EN"
            ? "Course updated successfully"
            : "Mata kuliah berhasil diperbarui",
          "success",
        );

        // Close modal after success
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        throw new Error(response.message || "Failed to update course");
      }
    } catch (error: any) {
      console.error("Error updating course:", error);
      showToast(
        language === "EN"
          ? "Failed to update course"
          : "Gagal memperbarui mata kuliah",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading || !course) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} items-center justify-center`}
        edges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#EF4444" : "#EF4444"}
        />
        <Text className={`mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          {language === "EN" ? "Loading..." : "Memuat..."}
        </Text>
      </SafeAreaViewComponent>
    );
  }

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Header */}
        <Header
          title={language === "EN" ? "Edit Course" : "Edit Mata Kuliah"}
          subtitle={
            language === "EN"
              ? "Update course information"
              : "Perbarui informasi mata kuliah"
          }
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        {/* Form */}
        <KeyboardAwareScrollView
          className="flex-1 px-6 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          keyboardShouldPersistTaps="handled"
        >
          <View className="space-y-4">
            {/* Course Code */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Course Code" : "Kode Mata Kuliah"}
                <Text className="text-red-500"> *</Text>
              </Text>
              <TextInput
                value={formData.kode_matkul}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    kode_matkul: text.toUpperCase(),
                  })
                }
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
                placeholder="IF101"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>

            {/* Course Name */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Course Name" : "Nama Mata Kuliah"}
                <Text className="text-red-500"> *</Text>
              </Text>
              <TextInput
                value={formData.nama_matkul}
                onChangeText={(text) =>
                  setFormData({ ...formData, nama_matkul: text })
                }
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
                placeholder={
                  language === "EN" ? "Course Name" : "Nama Mata Kuliah"
                }
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>

            {/* SKS and Semester */}
            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <Text
                  className={`mb-2 font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  SKS
                  <Text className="text-red-500"> *</Text>
                </Text>
                <Dropdown
                  options={SKS_OPTIONS}
                  selectedValue={sksInput}
                  onValueChange={(value) => {
                    setSksInput(value);
                    setFormData({ ...formData, sks: parseInt(value) });
                  }}
                  placeholderEN="Select SKS"
                  placeholderID="Pilih SKS"
                  isDarkMode={isDarkMode}
                  language={language}
                />
              </View>

              <View className="flex-1">
                <Text
                  className={`mb-2 font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Semester" : "Semester"}
                  <Text className="text-red-500"> *</Text>
                </Text>
                <Dropdown
                  options={SEMESTER_OPTIONS}
                  selectedValue={formData.semester}
                  onValueChange={(value) =>
                    setFormData({ ...formData, semester: value })
                  }
                  placeholderEN="Select Semester"
                  placeholderID="Pilih Semester"
                  isDarkMode={isDarkMode}
                  language={language}
                />
              </View>
            </View>

            {/* Faculty Dropdown */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Faculty" : "Fakultas"}
                <Text className="text-red-500"> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowFacultyDropdown(!showFacultyDropdown)}
                className={`p-4 rounded-lg border flex-row justify-between items-center ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <Text
                  className={`flex-1 ${
                    !formData.fakultas
                      ? isDarkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {formData.fakultas
                    ? faculties.find((f) => f.value === formData.fakultas)
                        ?.label[language] || formData.fakultas
                    : language === "EN"
                      ? "Select Faculty"
                      : "Pilih Fakultas"}
                </Text>
                <Ionicons
                  name={showFacultyDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>

              {showFacultyDropdown && (
                <View
                  className={`absolute top-full left-0 right-0 mt-1 rounded-lg border max-h-40 overflow-y-auto z-50 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {faculties.map((faculty) => (
                    <TouchableOpacity
                      key={faculty.value}
                      onPress={() => {
                        setFormData({
                          ...formData,
                          fakultas: faculty.value,
                          jurusan: "", // Reset department when faculty changes
                          dosen_pengajar: "", // Reset lecturer when faculty changes
                        });
                        setShowFacultyDropdown(false);
                      }}
                      className={`p-3 border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      } ${formData.fakultas === faculty.value ? "bg-blue-500" : ""}`}
                    >
                      <Text
                        className={`${
                          formData.fakultas === faculty.value
                            ? "text-white"
                            : isDarkMode
                              ? "text-white"
                              : "text-gray-800"
                        }`}
                      >
                        {faculty.label[language]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Department Dropdown */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Department" : "Jurusan"}
                <Text className="text-red-500"> *</Text>
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setShowDepartmentDropdown(!showDepartmentDropdown)
                }
                className={`p-4 rounded-lg border flex-row justify-between items-center ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
                disabled={!formData.fakultas}
              >
                <Text
                  className={`flex-1 ${
                    !formData.jurusan
                      ? isDarkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {!formData.jurusan
                    ? formData.fakultas
                      ? language === "EN"
                        ? "Select Department"
                        : "Pilih Jurusan"
                      : language === "EN"
                        ? "Select faculty first"
                        : "Pilih fakultas terlebih dahulu"
                    : currentDepartments.find(
                        (d) => d.value === formData.jurusan,
                      )?.label[language] || formData.jurusan}
                </Text>
                <Ionicons
                  name={showDepartmentDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>

              {showDepartmentDropdown && currentDepartments.length > 0 && (
                <View
                  className={`absolute top-full left-0 right-0 mt-1 rounded-lg border max-h-40 overflow-y-auto z-50 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {currentDepartments.map((dept: any) => (
                    <TouchableOpacity
                      key={dept.value}
                      onPress={() => {
                        setFormData({
                          ...formData,
                          jurusan: dept.value,
                          dosen_pengajar: "", // Reset lecturer when department changes
                        });
                        setShowDepartmentDropdown(false);
                      }}
                      className={`p-3 border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      } ${formData.jurusan === dept.value ? "bg-blue-500" : ""}`}
                    >
                      <Text
                        className={`${
                          formData.jurusan === dept.value
                            ? "text-white"
                            : isDarkMode
                              ? "text-white"
                              : "text-gray-800"
                        }`}
                      >
                        {dept.label[language]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Lecturer Dropdown */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Lecturer" : "Dosen Pengajar"}
                <Text className="text-gray-400">
                  {" "}
                  ({language === "EN" ? "Optional" : "Opsional"})
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowLecturerDropdown(!showLecturerDropdown)}
                className={`p-4 rounded-lg border flex-row justify-between items-center ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
                disabled={!formData.jurusan}
              >
                <Text
                  className={`flex-1 ${
                    !formData.dosen_pengajar
                      ? isDarkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {!formData.dosen_pengajar
                    ? formData.jurusan
                      ? language === "EN"
                        ? "Select Lecturer"
                        : "Pilih Dosen"
                      : language === "EN"
                        ? "Select department first"
                        : "Pilih jurusan terlebih dahulu"
                    : currentLecturers.find(
                        (l) => l.name === formData.dosen_pengajar,
                      )?.name || formData.dosen_pengajar}
                </Text>
                <Ionicons
                  name={showLecturerDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>

              {showLecturerDropdown && currentLecturers.length > 0 && (
                <View
                  className={`absolute top-full left-0 right-0 mt-1 rounded-lg border max-h-40 overflow-y-auto z-50 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                  style={{ maxHeight: 125 }}
                >
                  <ScrollView
                    style={{ maxHeight: 125 }}
                    nestedScrollEnabled={true}
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    {currentLecturers.map((lecturer) => (
                      <TouchableOpacity
                        key={lecturer.id}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            dosen_pengajar: lecturer.name,
                          });
                          setShowLecturerDropdown(false);
                        }}
                        className={`p-3 border-b ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        } ${formData.dosen_pengajar === lecturer.name ? "bg-blue-500" : ""}`}
                      >
                        <Text
                          className={`${
                            formData.dosen_pengajar === lecturer.name
                              ? "text-white"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {lecturer.name}
                        </Text>
                        <Text
                          className={`text-xs ${
                            formData.dosen_pengajar === lecturer.name
                              ? "text-blue-100"
                              : isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                          }`}
                        >
                          {lecturer.username}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {showLecturerDropdown &&
                formData.jurusan &&
                currentLecturers.length === 0 && (
                  <View
                    className={`mt-1 rounded-lg border p-3 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {language === "EN"
                        ? "No lecturers available for this department"
                        : "Tidak ada dosen tersedia untuk jurusan ini"}
                    </Text>
                  </View>
                )}
            </View>

            {/* Hari Dropdown */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Day" : "Hari"}
                <Text className="text-gray-400">
                  {" "}
                  ({language === "EN" ? "Optional" : "Opsional"})
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => setShowHariDropdown(!showHariDropdown)}
                className={`p-4 rounded-lg border flex-row justify-between items-center ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
              >
                <Text
                  className={`flex-1 ${
                    !formData.hari
                      ? isDarkMode
                        ? "text-gray-400"
                        : "text-gray-500"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {formData.hari
                    ? hariOptions.find((h) => h.value === formData.hari)?.label[
                        language
                      ] || formData.hari
                    : language === "EN"
                      ? "Select Day"
                      : "Pilih Hari"}
                </Text>
                <Ionicons
                  name={showHariDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>

              {showHariDropdown && (
                <View
                  className={`absolute top-full left-0 right-0 mt-1 rounded-lg border z-50 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-300"
                  }`}
                  style={{ maxHeight: 125 }}
                >
                  <ScrollView
                    style={{ maxHeight: 125 }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    onStartShouldSetResponder={() => true}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    {hariOptions.map((hari) => (
                      <TouchableOpacity
                        key={hari.value}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            hari: hari.value,
                          });
                          setShowHariDropdown(false);
                        }}
                        className={`p-3 border-b ${
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        } ${formData.hari === hari.value ? "bg-blue-500" : ""}`}
                      >
                        <Text
                          className={`${
                            formData.hari === hari.value
                              ? "text-white"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {hari.label[language]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Schedule Section - Time & Room Only */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Schedule" : "Jadwal"}
                <Text className="text-gray-400">
                  {" "}
                  ({language === "EN" ? "Optional" : "Opsional"})
                </Text>
              </Text>

              {/* Time Inputs */}
              <View className="flex-row gap-2 mb-2">
                {/* Start Time */}
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Start Time" : "Waktu Mulai"}
                  </Text>
                  <View className="flex-row gap-1">
                    {/* Start Hour Dropdown */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowStartHourDropdown(!showStartHourDropdown);
                          setShowStartMinuteDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !startHour
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {startHour || "HH"}
                        </Text>
                        <Ionicons
                          name={
                            showStartHourDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showStartHourDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 125 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 125 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {hours.map((h) => (
                              <TouchableOpacity
                                key={h.value}
                                onPress={() => {
                                  setStartHour(h.value);
                                  setShowStartHourDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${startHour === h.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    startHour === h.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {h.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`self-center ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      :
                    </Text>
                    {/* Start Minute Dropdown */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowStartMinuteDropdown(!showStartMinuteDropdown);
                          setShowStartHourDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !startMinute
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {startMinute || "MM"}
                        </Text>
                        <Ionicons
                          name={
                            showStartMinuteDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showStartMinuteDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 125 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 125 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {minutes.map((m) => (
                              <TouchableOpacity
                                key={m.value}
                                onPress={() => {
                                  setStartMinute(m.value);
                                  setShowStartMinuteDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${startMinute === m.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    startMinute === m.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {/* End Time */}
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "End Time" : "Waktu Selesai"}
                  </Text>
                  <View className="flex-row gap-1">
                    {/* End Hour Dropdown */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowEndHourDropdown(!showEndHourDropdown);
                          setShowEndMinuteDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !endHour
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {endHour || "HH"}
                        </Text>
                        <Ionicons
                          name={
                            showEndHourDropdown ? "chevron-up" : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showEndHourDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 125 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 125 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {hours.map((h) => (
                              <TouchableOpacity
                                key={h.value}
                                onPress={() => {
                                  setEndHour(h.value);
                                  setShowEndHourDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${endHour === h.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    endHour === h.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {h.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`self-center ${isDarkMode ? "text-white" : "text-gray-800"}`}
                    >
                      :
                    </Text>
                    {/* End Minute Dropdown */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowEndMinuteDropdown(!showEndMinuteDropdown);
                          setShowEndHourDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !endMinute
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {endMinute || "MM"}
                        </Text>
                        <Ionicons
                          name={
                            showEndMinuteDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showEndMinuteDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 125 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 125 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {minutes.map((m) => (
                              <TouchableOpacity
                                key={m.value}
                                onPress={() => {
                                  setEndMinute(m.value);
                                  setShowEndMinuteDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${endMinute === m.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    endMinute === m.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Room Input */}
              <View>
                <Text
                  className={`font-medium mb-1 ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Room" : "Ruangan"}
                </Text>
                <TextInput
                  value={formData.room}
                  onChangeText={(text) =>
                    setFormData({ ...formData, room: text })
                  }
                  className={`p-4 rounded-lg border ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-gray-50 border-gray-300 text-gray-800"
                  }`}
                  placeholder={
                    language === "EN"
                      ? "Room (e.g. B401)"
                      : "Ruangan (contoh: B401)"
                  }
                  placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
              </View>
            </View>

            {/* Course Info */}
            <View className="mb-2">
              <View
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-medium mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "EN"
                    ? "Current Course Info"
                    : "Info Mata Kuliah Saat Ini"}
                </Text>
                <View className="space-y-1">
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "ID" : "ID"}: {course.id}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Created" : "Dibuat"}:{" "}
                    {formatDate(course.created_at, timezoneInfo.timezone)}
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {language === "EN" ? "Last Updated" : "Terakhir Diupdate"}:{" "}
                    {formatDate(course.updated_at, timezoneInfo.timezone)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Required Note */}
            <View
              className={`p-3 rounded-lg ${
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <Text className="text-red-500">*</Text>{" "}
                {language === "EN" ? "Required fields" : "Field wajib diisi"}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-4">
            <TouchableOpacity
              onPress={handleUpdateCourse}
              disabled={loading || !hasChanges}
              className={`p-4 rounded-lg ${
                loading || !hasChanges
                  ? isDarkMode
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-300 border-gray-300"
                  : isDarkMode
                    ? "bg-blue-600 border-blue-600"
                    : "bg-blue-500 border-blue-500"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  loading || !hasChanges
                    ? isDarkMode
                      ? "text-gray-500"
                      : "text-gray-600"
                    : "text-white"
                }`}
              >
                {loading
                  ? language === "EN"
                    ? "Updating..."
                    : "Memperbarui..."
                  : language === "EN"
                    ? "Update Course"
                    : "Perbarui Mata Kuliah"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>

      {/* Cancel Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showCancelModal}
        title={language === "EN" ? "Discard Changes?" : "Batalkan Perubahan?"}
        message={
          language === "EN"
            ? "Are you sure you want to discard the changes to this course?"
            : "Apakah Anda yakin ingin membatalkan perubahan pada mata kuliah ini?"
        }
        warningText={
          language === "EN"
            ? "All unsaved changes will be lost."
            : "Semua perubahan yang belum disimpan akan hilang."
        }
        itemName={course.nama_matkul}
        isDarkMode={isDarkMode}
        language={language}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false);
          router.back();
        }}
      />
    </SafeAreaViewComponent>
  );
}
