import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface TitleProps {
  title: string;
  subtitle?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  onBackPress?: () => void;
  showBackButton?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  backgroundColor?: string;
}

export default function Title({
  title,
  subtitle,
  isDarkMode,
  language,
  onBackPress,
  showBackButton = false,
  rightIcon,
  onRightIconPress,
  backgroundColor,
}: TitleProps) {
  return (
    <View
      className={`flex-1 ${backgroundColor || (isDarkMode ? "bg-gray-900" : "bg-gray-50")}`}
    >
      <View className="px-6 py-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {showBackButton && onBackPress && (
              <TouchableOpacity
                onPress={onBackPress}
                className="mr-4 p-2 rounded-lg"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDarkMode ? "#FFFFFF" : "#1F2937"}
                />
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  className={`text-sm mt-1 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {rightIcon && onRightIconPress && (
            <TouchableOpacity
              onPress={onRightIconPress}
              className="p-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Ionicons
                name={rightIcon}
                size={24}
                color={isDarkMode ? "#FFFFFF" : "#1F2937"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
