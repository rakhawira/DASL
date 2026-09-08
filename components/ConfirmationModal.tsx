import { Ionicons as ExpoIonicons, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type IoniconsName = React.ComponentProps<typeof ExpoIonicons>["name"];

interface ConfirmationModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  items?: Array<{ id: number | string; title: string; subtitle?: string }>;
  isDarkMode: boolean;
  language: "EN" | "ID";
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  icon?: IoniconsName;
  iconColor?: string;
  confirmButtonColor?: string;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  items,
  isDarkMode,
  language,
  onCancel,
  onConfirm,
  isLoading = false,
  confirmText,
  cancelText,
  icon = "help-circle-outline",
  iconColor = "#3B82F6",
  confirmButtonColor = "bg-blue-500",
}: ConfirmationModalProps) {
  const defaultTitle = language === "EN" ? "Confirm" : "Konfirmasi";
  const defaultMessage =
    language === "EN"
      ? "Are you sure you want to proceed?"
      : "Apakah Anda yakin ingin melanjutkan?";
  const defaultConfirmText = language === "EN" ? "Confirm" : "Konfirmasi";
  const defaultCancelText = language === "EN" ? "Cancel" : "Batal";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <View
          className={`w-full max-w-md rounded-2xl p-6 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-xl`}
        >
          {/* Header */}
          <View className="items-center mb-4">
            <View
              className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${
                isDarkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <Ionicons name={icon} size={32} color={iconColor} />
            </View>
            <Text
              className={`text-xl font-bold text-center ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {title || defaultTitle}
            </Text>
          </View>

          {/* Message */}
          {message && (
            <Text
              className={`text-sm text-center mb-4 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {message}
            </Text>
          )}

          {/* Items List */}
          {items && items.length > 0 && (
            <View className="mb-4">
              <ScrollView
                className="max-h-40"
                showsVerticalScrollIndicator={true}
              >
                {items.map((item) => (
                  <View
                    key={item.id}
                    className={`p-3 rounded-lg mb-2 ${
                      isDarkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text
                        className={`text-xs ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg border ${
                isDarkMode
                  ? "border-gray-600 bg-gray-700"
                  : "border-gray-300 bg-gray-100"
              } ${isLoading ? "opacity-50" : ""}`}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text
                className={`text-center font-medium ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {cancelText || defaultCancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg ${confirmButtonColor} ${
                isLoading ? "opacity-50" : ""
              }`}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium text-center">
                  {confirmText || defaultConfirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
