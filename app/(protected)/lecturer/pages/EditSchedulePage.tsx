import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import Dropdown from "@/components/Dropdown";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { createScheduleRequest } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { HARI_OPTIONS } from "@/types/dropdown";

export default function EditScheduleTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scheduleId: string;
    courseName: string;
    courseCode: string;
    startTime: string;
    endTime: string;
    room: string;
    hari: string;
    sks: string;
  }>();

  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState({
    courseName: "",
    courseCode: "",
    startTime: "",
    endTime: "",
    room: "",
    hari: "",
  });

  // Parse time from query params
  const parseTime = (time: string) => {
    if (!time || !time.includes(":")) return { hour: "", minute: "" };
    const [h, m] = time.split(":");
    return { hour: h || "", minute: m || "" };
  };

  const { hour: initialStartHour, minute: initialStartMinute } = parseTime(
    params?.startTime || "",
  );
  const { hour: initialEndHour, minute: initialEndMinute } = parseTime(
    params?.endTime || "",
  );

  const [startHour, setStartHour] = useState(initialStartHour);
  const [startMinute, setStartMinute] = useState(initialStartMinute);
  const [endHour, setEndHour] = useState(initialEndHour);
  const [endMinute, setEndMinute] = useState(initialEndMinute);
  const [showStartHourDropdown, setShowStartHourDropdown] = useState(false);
  const [showStartMinuteDropdown, setShowStartMinuteDropdown] = useState(false);
  const [showEndHourDropdown, setShowEndHourDropdown] = useState(false);
  const [showEndMinuteDropdown, setShowEndMinuteDropdown] = useState(false);

  // Generate options using helper functions
  const hours = Array.from({ length: 24 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  const minutes = Array.from({ length: 60 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  // Update formData when time picker states change
  React.useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      startTime: startHour && startMinute ? `${startHour}:${startMinute}` : "",
      endTime: endHour && endMinute ? `${endHour}:${endMinute}` : "",
    }));
  }, [startHour, startMinute, endHour, endMinute]);

  const handleUpdateSchedule = async () => {
    if (
      !params?.scheduleId ||
      !formData.courseName ||
      !formData.courseCode ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.room
    ) {
      showToast(
        language === "EN"
          ? "Please fill in all required fields"
          : "Harap isi semua field yang wajib diisi",
        "error",
      );
      return;
    }

    try {
      setLoading(true);

      // Check if there are actual changes
      const hasChanges =
        formData.startTime !== (params?.startTime || "") ||
        formData.endTime !== (params?.endTime || "") ||
        formData.room !== (params?.room || "");

      if (!hasChanges) {
        showToast(
          language === "EN"
            ? "No changes detected"
            : "Tidak ada perubahan yang terdeteksi",
          "info",
        );
        setLoading(false);
        return;
      }

      // Create schedule request for approval
      const requestData = {
        course_id: parseInt(params.scheduleId),
        course_name: formData.courseName,
        course_code: formData.courseCode,
        start_time: formData.startTime,
        end_time: formData.endTime,
        room: formData.room,
        hari: formData.hari,
        requested_by: user?.name || user?.username || "Unknown",
        original_data: {
          id: params.scheduleId,
          courseName: params.courseName,
          courseCode: params.courseCode,
          startTime: params.startTime,
          endTime: params.endTime,
          room: params.room,
          hari: params.hari,
        },
      };

      const response = await createScheduleRequest(requestData);

      if (response.success) {
        showToast(
          language === "EN"
            ? "Schedule edit request submitted for approval"
            : "Permintaan edit jadwal diajukan untuk persetujuan",
          "success",
        );

        // Go back to schedule list
        router.back();
      } else {
        throw new Error(response.message || "Failed to submit request");
      }
    } catch (error: any) {
      console.error("Error creating schedule request:", error);
      showToast(
        language === "EN"
          ? "Failed to submit schedule edit request"
          : "Gagal mengajukan permintaan edit jadwal",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize form from query params on mount (only once)
  useEffect(() => {
    if (params && !initialized) {
      setFormData({
        courseName: params.courseName || "",
        courseCode: params.courseCode || "",
        startTime: params.startTime || "",
        endTime: params.endTime || "",
        room: params.room || "",
        hari: params.hari || "",
      });

      // Update time picker states
      const { hour: startH, minute: startM } = parseTime(
        params.startTime || "",
      );
      const { hour: endH, minute: endM } = parseTime(params.endTime || "");
      setStartHour(startH);
      setStartMinute(startM);
      setEndHour(endH);
      setEndMinute(endM);

      setInitialized(true);
    }
  }, [params, initialized]);

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-white"}`}>
        <Header
          title={language === "EN" ? "Edit Schedule" : "Edit Jadwal"}
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
                value={formData.courseCode}
                editable={false}
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-600 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-800"
                }`}
                placeholder="IF101"
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
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
                value={formData.courseName}
                editable={false}
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

            {/* Hari Dropdown */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Day" : "Hari"}
                <Text className="text-red-500"> *</Text>
              </Text>
              <Dropdown
                options={HARI_OPTIONS}
                selectedValue={formData.hari}
                onValueChange={(value) =>
                  setFormData({ ...formData, hari: value })
                }
                placeholderEN="Select Day"
                placeholderID="Pilih Hari"
                isDarkMode={isDarkMode}
                language={language === "EN" ? "EN" : "ID"}
              />
            </View>

            {/* Time Inputs */}
            <View className="flex-row gap-2 mb-2">
              {/* Start Time */}
              <View className="flex-1">
                <Text
                  className={`mb-2 font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Start Time" : "Waktu Mulai"}
                  <Text className="text-red-500"> *</Text>
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
                          showStartHourDropdown ? "chevron-up" : "chevron-down"
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
                  className={`mb-2 font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "End Time" : "Waktu Selesai"}
                  <Text className="text-red-500"> *</Text>
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
                          showEndMinuteDropdown ? "chevron-up" : "chevron-down"
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

            {/* Room */}
            <View className="mb-2">
              <Text
                className={`mb-2 font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Room" : "Ruangan"}
                <Text className="text-red-500"> *</Text>
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
                  language === "EN" ? "Enter room" : "Masukkan ruangan"
                }
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>
          </View>

          {/* Update Button */}
          <View className="mt-4">
            <TouchableOpacity
              className={`py-3 rounded-lg ${
                isDarkMode ? "bg-blue-600" : "bg-blue-500"
              } ${loading ? "opacity-50" : ""}`}
              onPress={handleUpdateSchedule}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-medium text-center">
                  {language === "EN" ? "Update Schedule" : "Perbarui Jadwal"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
