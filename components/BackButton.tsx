import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity } from "react-native";

interface BackButtonProps {
  onPress: () => void;
  isDarkMode: boolean;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  isDarkMode,
  size = 20,
  backgroundColor,
  iconColor,
}) => {
  const defaultBgColor =
    backgroundColor || (isDarkMode ? "bg-gray-800" : "bg-gray-200");
  const defaultIconColor = iconColor || (isDarkMode ? "#9CA3AF" : "#6B7280");

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`p-2 rounded-lg ${defaultBgColor}`}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={size} color={defaultIconColor} />
    </TouchableOpacity>
  );
};

export default BackButton;
