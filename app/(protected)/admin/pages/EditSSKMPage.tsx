import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
    getActivityPoints,
    getUsers,
    updateActivityPoint,
} from "@/services/api";
import { ActivityPoint } from "@/types/sskm";
import { User } from "@/types/user";
import { formatDate } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";
import { ACTIVITY_CATEGORIES } from "../../../../constants/sskmConstants";
import { useTimezone } from "../../../../hooks/useTimezone";

export default function EditSSKMTab(): React.ReactNode {
  const router = useRouter();
  const { activityId, studentId } = useLocalSearchParams<{
    activityId: string;
    studentId: string;
  }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { timezoneInfo } = useTimezone();

  const [activity, setActivity] = useState<ActivityPoint | null>(null);
  const [student, setStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    activityType: "",
    activityName: "",
    points: "",
    description: "",
  });

  // UI date state for display
  const [uiDate, setUiDate] = useState("");

  useEffect(() => {
    fetchData();
  }, [activityId, studentId]);

  const fetchData = async () => {
    if (!activityId || !studentId) {
      setLoading(false);
      return;
    }
    try {
      const [activityData, users] = await Promise.all([
        getActivityPoints(),
        getUsers(),
      ]);
      const foundActivity = activityData.data.find(
        (a: ActivityPoint) => a.id.toString() === activityId,
      );
      const foundStudent = users.data.find(
        (u: User) => u.id.toString() === studentId,
      );
      if (foundActivity && foundStudent) {
        setActivity(foundActivity);
        setStudent(foundStudent);
      } else {
        showToast(
          language === "EN"
            ? "Activity or student not found"
            : "Aktivitas atau mahasiswa tidak ditemukan",
          "error",
        );
        router.back();
      }
    } catch (error) {
      showToast(
        language === "EN" ? "Failed to load data" : "Gagal memuat data",
        "error",
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Initialize form data when activity is loaded
  useEffect(() => {
    if (activity) {
      setFormData({
        activityType: activity.activity_type,
        activityName: activity.activity_name,
        points: activity.points.toString(),
        description: activity.description,
      });
      setUiDate(
        formatDate(activity.date || activity.created_at, timezoneInfo.timezone),
      );
    }
  }, [activity, timezoneInfo.timezone]);

  // Handle date input change (optional - not sent to API)
  const handleDateChange = (text: string) => {
    console.log("Edit date input changed:", text);
    setUiDate(text); // Update UI display only
  };

  // Handle edit activity points
  const handleEditActivity = async () => {
    if (!formData.activityType || !formData.activityName || !formData.points) {
      showToast(
        language === "EN"
          ? "Please fill all required fields"
          : "Harap isi semua field yang wajib",
        "error",
      );
      return;
    }

    try {
      setIsLoading(true);
      const activityData = {
        activity_type: formData.activityType,
        activity_name: formData.activityName,
        points: parseInt(formData.points),
        description: formData.description,
      };

      const response = await updateActivityPoint(activity.id, activityData);

      if (response.success) {
        showToast(
          language === "EN"
            ? "Activity updated successfully"
            : "Kegiatan berhasil diperbarui",
          "success",
        );
        router.back();
      } else {
        showToast(
          language === "EN"
            ? "Failed to update activity"
            : "Gagal memperbarui kegiatan",
          "error",
        );
      }
    } catch (error) {
      console.error("Error updating activity:", error);
      showToast(
        language === "EN"
          ? "Failed to update activity"
          : "Gagal memperbarui kegiatan",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !activity || !student) {
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
        <Header
          title={
            language === "EN" ? "Edit Activity Points" : "Edit Poin Kegiatan"
          }
          subtitle={student.name}
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        <KeyboardAwareScrollView
          className="flex-1 px-6"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Activity Type Selection */}
          <View className="mb-6">
            <Text
              className={`text-sm font-medium mb-3 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN" ? "Activity Category" : "Kategori Kegiatan"}
            </Text>
            <View className="grid grid-cols-2 gap-3">
              {ACTIVITY_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  className={`p-3 rounded-xl border-2 ${
                    formData.activityType === category.id
                      ? "border-blue-500 bg-blue-50"
                      : isDarkMode
                        ? "border-gray-700 bg-gray-800"
                        : "border-gray-200 bg-white"
                  }`}
                  onPress={() =>
                    setFormData({ ...formData, activityType: category.id })
                  }
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={category.color}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        formData.activityType === category.id
                          ? "text-blue-600"
                          : isDarkMode
                            ? "text-gray-300"
                            : "text-gray-700"
                      }`}
                    >
                      {language === "EN" ? category.name : category.nameId}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs mt-1 ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Max: {category.maxPoints} pts
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Activity Name */}
          <View className="mb-4">
            <Text
              className={`text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN" ? "Activity Name" : "Nama Kegiatan"} *
            </Text>
            <TextInput
              className={`p-3 rounded-xl ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              placeholder={
                language === "EN"
                  ? "Enter activity name"
                  : "Masukkan nama kegiatan"
              }
              value={formData.activityName}
              onChangeText={(text) =>
                setFormData({ ...formData, activityName: text })
              }
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </View>

          {/* Points */}
          <View className="mb-4">
            <Text
              className={`text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN" ? "Points" : "Poin"} *
            </Text>
            <TextInput
              className={`p-3 rounded-xl ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              placeholder="0"
              value={formData.points}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  points: text.replace(/[^0-9]/g, ""),
                })
              }
              keyboardType="numeric"
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </View>

          {/* Date */}
          <View className="mb-4">
            <Text
              className={`text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN" ? "Date" : "Tanggal"}
            </Text>
            <TextInput
              className={`p-3 rounded-xl ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              placeholder={language === "EN" ? "17 Jan 2026" : "17 Jan 2026"}
              value={uiDate}
              onChangeText={handleDateChange}
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text
              className={`text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {language === "EN" ? "Description" : "Deskripsi"}
            </Text>
            <TextInput
              className={`p-3 rounded-xl ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
              } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              placeholder={
                language === "EN"
                  ? "Enter activity description"
                  : "Masukkan deskripsi kegiatan"
              }
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={3}
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`p-4 rounded-xl mb-6 ${
              isDarkMode ? "bg-blue-600" : "bg-blue-500"
            } ${isLoading ? "opacity-50" : ""}`}
            onPress={handleEditActivity}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-center">
                {language === "EN" ? "Update Activity" : "Perbarui Kegiatan"}
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
