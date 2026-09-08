import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { updateDevice } from "@/services/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function EditDevicesPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const deviceId = params.deviceId as string;
  const deviceName = params.deviceName as string;
  const deviceLocation = params.deviceLocation as string;
  const macAddress = params.macAddress as string;

  const [editForm, setEditForm] = useState({
    device_name: deviceName || "",
    location: deviceLocation || "",
  });

  const handleUpdateDevice = async () => {
    if (!editForm.device_name.trim() || !editForm.location.trim()) {
      showToast(
        language === "EN"
          ? "Please fill in all required fields"
          : "Harap isi semua field yang wajib",
        "error",
      );
      return;
    }

    try {
      const data = await updateDevice(deviceId, editForm);

      if (data.success) {
        showToast(
          language === "EN"
            ? "Device updated successfully"
            : "Perangkat berhasil diupdate",
          "success",
        );
        router.back();
      } else {
        showToast(data.error || "Failed to update device", "error");
      }
    } catch (error) {
      showToast(
        language === "EN"
          ? "Network error while updating device"
          : "Error jaringan saat mengupdate perangkat",
        "error",
      );
      console.error("Error updating device:", error);
    }
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
        title={language === "EN" ? "Edit Device" : "Edit Perangkat"}
        isDarkMode={isDarkMode}
        onBack={() => router.back()}
      />

      <View className="p-6">
        <View className="mb-4">
          <Text
            className={`mb-2 text-sm font-medium ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`}
          >
            {language === "EN" ? "Device Name" : "Nama Perangkat"}
          </Text>
          <TextInput
            className={`p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            value={editForm.device_name}
            onChangeText={(text) =>
              setEditForm({ ...editForm, device_name: text })
            }
            placeholder={
              language === "EN"
                ? "Enter device name"
                : "Masukkan nama perangkat"
            }
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>

        <View className="mb-4">
          <Text
            className={`mb-2 text-sm font-medium ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`}
          >
            {language === "EN" ? "Location" : "Lokasi"}
          </Text>
          <TextInput
            className={`p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            value={editForm.location}
            onChangeText={(text) =>
              setEditForm({ ...editForm, location: text })
            }
            placeholder={
              language === "EN" ? "Enter location" : "Masukkan lokasi"
            }
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </View>

        <View className="mb-4">
          <Text
            className={`mb-2 text-sm font-medium ${
              isDarkMode ? "text-white" : "text-gray-700"
            }`}
          >
            {language === "EN" ? "MAC Address" : "Alamat MAC"}
          </Text>
          <TextInput
            className={`p-3 rounded-lg border ${
              isDarkMode
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-800"
            }`}
            value={macAddress || ""}
            editable={false}
            placeholder="MAC Address"
            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`mt-1 text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {language === "EN"
              ? "MAC address is automatically detected"
              : "Alamat MAC terdeteksi otomatis"}
          </Text>
        </View>

        <TouchableOpacity
          className="bg-blue-500 p-4 rounded-lg"
          onPress={handleUpdateDevice}
        >
          <Text className="text-white text-center font-bold">
            {language === "EN" ? "Update Device" : "Update Perangkat"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaViewComponent>
  );
}
