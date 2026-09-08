import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface DeleteConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  warningText?: string;
  itemName?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  visible,
  title,
  message,
  warningText,
  itemName,
  isDarkMode,
  language,
  onCancel,
  onConfirm,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const defaultTitle = language === "EN" ? "Delete Item?" : "Hapus Item?";
  const defaultMessage = language === "EN"
    ? `Are you sure you want to delete "${itemName}"?`
    : `Apakah Anda yakin ingin menghapus "${itemName}"?`;
  const defaultWarning = language === "EN"
    ? "This action cannot be undone."
    : "Tindakan ini tidak dapat dibatalkan.";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View
          className={`w-11/12 p-6 rounded-2xl ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-xl`}
        >
          <View className="items-center mb-4">
            <View
              className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                isDarkMode ? "bg-red-900" : "bg-red-100"
              }`}
            >
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text
              className={`text-xl font-bold text-center ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {title || defaultTitle}
            </Text>
            <Text
              className={`text-sm text-center mt-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {message || defaultMessage}
            </Text>
            <Text
              className={`text-xs text-center mt-1 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {warningText || defaultWarning}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`flex-1 p-3 rounded-xl ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text
                className={`text-center font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Cancel" : "Batal"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 p-3 rounded-xl bg-red-500 ${
                isLoading ? "opacity-50" : ""
              }`}
              onPress={onConfirm}
              disabled={isLoading}
            >
              <Text className="text-white font-medium text-center">
                {isLoading
                  ? language === "EN" ? "Deleting..." : "Menghapus..."
                  : language === "EN" ? "Delete" : "Hapus"
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
