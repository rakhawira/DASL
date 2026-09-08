import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface SimpleTitleProps {
  title: string;
  subtitle?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  onBack?: () => void;
  rightComponent?: React.ReactNode;
}

export default function SimpleTitle({
  title,
  subtitle,
  isDarkMode,
  language,
  onBack,
  rightComponent,
}: SimpleTitleProps) {
  return (
    <View className="px-6 py-6">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {onBack && (
            <TouchableOpacity onPress={onBack} className="mr-4">
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDarkMode ? "white" : "black"}
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
        {rightComponent && <View>{rightComponent}</View>}
      </View>
    </View>
  );
}
