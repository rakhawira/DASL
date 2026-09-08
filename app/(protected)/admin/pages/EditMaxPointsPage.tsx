import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updateMaxRequiredPoints } from "@/services/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function EditMaxPointsPage(): React.ReactNode {
  const router = useRouter();
  const { maxPoints } = useLocalSearchParams<{ maxPoints: string }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [pointsValue, setPointsValue] = useState(maxPoints || "100");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    const points = parseInt(pointsValue);
    if (isNaN(points) || points <= 0) {
      showToast(
        language === "EN"
          ? "Please enter valid points"
          : "Masukkan poin yang valid",
        "error",
      );
      return;
    }

    try {
      setIsUpdating(true);
      const response = await updateMaxRequiredPoints(points);
      if (response.success) {
        showToast(
          language === "EN"
            ? "Max points updated successfully"
            : "Poin maksimum berhasil diperbarui",
          "success",
        );
        router.back();
      } else {
        showToast(
          language === "EN"
            ? "Failed to update max points"
            : "Gagal memperbarui poin maksimum",
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "EN"
          ? "Failed to update max points"
          : "Gagal memperbarui poin maksimum",
        "error",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <Header
        title={language === "EN" ? "Edit Max Points" : "Edit Poin Maksimum"}
        subtitle={
          language === "EN"
            ? "Set maximum required activity points"
            : "Atur poin kegiatan maksimum yang dibutuhkan"
        }
        isDarkMode={isDarkMode}
        onBack={() => router.back()}
      />

      <View className="flex-1 px-6 pt-6">
        <View
          className={`p-4 rounded-xl mb-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-md`}
        >
          <Text
            className={`text-sm font-medium mb-2 ${
              isDarkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {language === "EN" ? "Maximum Points" : "Poin Maksimum"}
          </Text>
          <TextInput
            className={`p-4 rounded-xl text-lg ${
              isDarkMode
                ? "bg-gray-700 text-white"
                : "bg-gray-100 text-gray-800"
            } border ${isDarkMode ? "border-gray-600" : "border-gray-200"}`}
            placeholder="100"
            value={pointsValue}
            onChangeText={(text) => setPointsValue(text.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`text-xs mt-2 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {language === "EN"
              ? "Enter the maximum points required for students to complete SSKM"
              : "Masukkan poin maksimum yang dibutuhkan mahasiswa untuk menyelesaikan SSKM"}
          </Text>
        </View>

        <TouchableOpacity
          className={`p-4 rounded-xl ${
            isDarkMode ? "bg-blue-600" : "bg-blue-500"
          } ${isUpdating ? "opacity-50" : ""}`}
          onPress={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-center">
              {language === "EN" ? "Save Changes" : "Simpan Perubahan"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaViewComponent>
  );
}
