import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isDarkMode: boolean;
  language: "EN" | "ID";
  loading?: boolean;
  disabled?: boolean;

  // Tinggi floating tab bar untuk alignment
  // FloatingTabBar menggunakan bottom-8 (32px dari bottom)
  tabBarHeight?: number;
  // Mode edit props
  isEdit?: boolean;
  onCancel?: () => void;
}

export const ChatInput = forwardRef<TextInput, ChatInputProps>(
  (
    {
      value,
      onChangeText,
      onSend,
      isDarkMode,
      language,
      loading,
      disabled,
      isEdit = false,
      onCancel,
    },
    ref,
  ) => {
    const canSend = value.trim() && !loading && !disabled;

    return (
      // paddingBottom menggunakan bottomInset + tabBarHeight agar input
      // sejajar dengan floating tab bar dan tidak tertutup home bar iPhone
      // atau navigation bar Android gesture mode.
      // Nilai minimum 8px agar tetap ada jarak meski inset = 0 (Android tombol fisik).
      <View
        style={{
          paddingBottom: 0,
          paddingHorizontal: 24,
          paddingTop: 12,
        }}
        className={` ${
          isDarkMode
            ? "bg-gray-900 border-gray-700"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        {isEdit && (
          <View className="flex-row items-center mb-2">
            <Text
              className={`flex-1 font-semibold ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Edit Message" : "Edit Pesan"}
            </Text>
            <TouchableOpacity onPress={onCancel} className="p-1">
              <Ionicons
                name="close"
                size={20}
                color={isDarkMode ? "#fff" : "#374151"}
              />
            </TouchableOpacity>
          </View>
        )}
        <View className={`flex-row items-end mb-4`}>
          <View
            className={`flex-1 py-3 px-2 rounded-3xl shadow-2xl border ${
              isDarkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              placeholder={
                isEdit
                  ? language === "EN"
                    ? "Edit your message..."
                    : "Edit pesan Anda..."
                  : language === "EN"
                    ? "Type a message..."
                    : "Ketik pesan..."
              }
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              style={{
                paddingHorizontal: 12,
                paddingTop: Platform.OS === "ios" ? 10 : 8,
                paddingBottom: Platform.OS === "ios" ? 10 : 8,
                fontSize: 14,
                lineHeight: 20,
                maxHeight: 120,
                color: isDarkMode ? "#ffffff" : "#1f2937",
              }}
              multiline
              scrollEnabled
              maxLength={500}
              returnKeyType="default"
              blurOnSubmit={false}
              textAlignVertical="center"
            />
          </View>
          <TouchableOpacity
            onPress={onSend}
            disabled={!canSend}
            style={{ marginLeft: 8, height: 60 }}
            className={`px-5 py-4 rounded-3xl items-center justify-center shadow-2xl border ${
              canSend
                ? isDarkMode
                  ? "bg-red-600 border-gray-700"
                  : "bg-red-500 border-gray-200"
                : isDarkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
            }`}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

ChatInput.displayName = "ChatInput";
