import { Ionicons } from "@expo/vector-icons";
import { Text, TextStyle, View, ViewStyle } from "react-native";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  title?: string;
  titleEN?: string;
  titleID?: string;
  subtitle?: string;
  subtitleEN?: string;
  subtitleID?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export default function EmptyState({
  icon = "folder-open-outline",
  iconSize = 48,
  titleEN = "No data found",
  titleID = "Tidak ada data ditemukan",
  subtitleEN = "There's nothing to show here",
  subtitleID = "Tidak ada yang dapat ditampilkan di sini",
  isDarkMode,
  language,
  containerStyle,
  titleStyle,
  subtitleStyle,
}: EmptyStateProps) {
  const title = language === "EN" ? titleEN : titleID;
  const subtitle = language === "EN" ? subtitleEN : subtitleID;

  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={containerStyle}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      <Text
        className={`mt-3 text-center text-lg font-medium ${
          isDarkMode ? "text-gray-300" : "text-gray-600"
        }`}
        style={titleStyle}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className={`mt-2 text-center text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
          style={subtitleStyle}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
