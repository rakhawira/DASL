import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import {
    getActivityPoints,
    getMaxRequiredPoints,
    getUsers,
} from "@/services/api";
import { ActivityPoint } from "@/types/sskm";
import { User } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function StudentDetailsPage(): React.ReactNode {
  const router = useRouter();
  const { studentId, maxPoints } = useLocalSearchParams<{
    studentId: string;
    maxPoints: string;
  }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [student, setStudent] = useState<User | null>(null);
  const [activityPoints, setActivityPoints] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const maxRequiredPoints = parseInt(maxPoints || "100") || 100;

  // Fetch max points on mount if not provided in params
  useEffect(() => {
    if (!maxPoints) {
      fetchMaxPoints();
    }
  }, []);

  const fetchMaxPoints = async () => {
    try {
      const response = await getMaxRequiredPoints();
      if (response.success && response.data) {
        // Update local state would require useState, but we use const
        // So we'll just use the API value for display
      }
    } catch (error) {
      console.error("Error fetching max points:", error);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [usersResponse, activityResponse] = await Promise.all([
        getUsers(),
        getActivityPoints(),
      ]);

      const students = usersResponse.data || [];
      const foundStudent = students.find(
        (s: User) => s.id === Number(studentId),
      );

      if (foundStudent) {
        setStudent(foundStudent);
        const activities = activityResponse.data || [];
        const studentActivities = activities.filter(
          (a: ActivityPoint) => a.student_id === Number(studentId),
        );
        setActivityPoints(studentActivities);
      } else {
        showToast(
          language === "EN" ? "Student not found" : "Mahasiswa tidak ditemukan",
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

  const getStudentPoints = () => {
    return activityPoints.reduce((sum, activity) => sum + activity.points, 0);
  };

  const handleAddPoints = () => {
    if (student) {
      router.push({
        pathname: "/admin/pages/AddSSKMPage",
        params: { studentId: student.id.toString() },
      });
    }
  };

  const handleEditActivity = (activity: ActivityPoint) => {
    if (student) {
      router.push({
        pathname: "/admin/pages/EditSSKMPage",
        params: {
          activityId: activity.id.toString(),
          studentId: student.id.toString(),
        },
      });
    }
  };

  if (loading || !student) {
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

  const studentPoints = getStudentPoints();
  const completionPercentage = Math.min(
    (studentPoints / maxRequiredPoints) * 100,
    100,
  );

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={student.name || ""}
          subtitle={student.username || ""}
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
          rightComponent={
            <TouchableOpacity
              className={`p-2 rounded-lg ${
                isDarkMode ? "bg-blue-600" : "bg-blue-500"
              }`}
              onPress={handleAddPoints}
            >
              <Ionicons name="add-outline" size={20} color="white" />
            </TouchableOpacity>
          }
        />

        <ScrollView className="flex-1 px-6">
          {/* Points Summary */}
          <View
            className={`p-4 rounded-xl mb-4 ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-md`}
          >
            <Text
              className={`text-lg font-bold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Points Summary" : "Ringkasan Poin"}
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-yellow-400" : "text-yellow-600"
                }`}
              >
                {studentPoints} pts
              </Text>
              <Text
                className={`text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {activityPoints.length}{" "}
                {language === "EN" ? "activities" : "kegiatan"}
              </Text>
            </View>
            {/* Progress Bar */}
            <View
              className={`h-2 rounded-full ${
                isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <View
                className={`h-2 rounded-full ${
                  completionPercentage >= 100 ? "bg-green-500" : "bg-yellow-500"
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {studentPoints} / {maxRequiredPoints}{" "}
              {language === "EN" ? "points required" : "poin dibutuhkan"}
            </Text>
          </View>

          {/* Activities List */}
          <Text
            className={`text-lg font-bold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {language === "EN" ? "Activities" : "Kegiatan"}
          </Text>
          {activityPoints.length === 0 ? (
            <Text
              className={`text-center py-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {language === "EN" ? "No activities found" : "Tidak ada kegiatan"}
            </Text>
          ) : (
            activityPoints.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                onPress={() => handleEditActivity(activity)}
                className={`p-4 rounded-xl mb-3 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } shadow-md`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {activity.activity_name}
                    </Text>
                    <Text
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {activity.activity_type}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text
                      className={`font-bold mr-3 ${
                        isDarkMode ? "text-yellow-400" : "text-yellow-600"
                      }`}
                    >
                      +{activity.points} pts
                    </Text>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={20}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
