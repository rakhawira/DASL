import React from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import BackButton from "./BackButton";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  isDarkMode: boolean;
  rightComponent?: React.ReactNode;
  // Digunakan oleh ViewChat untuk mengukur tinggi header secara dinamis
  // agar KeyboardAvoidingView bisa menghitung offset yang tepat
  onLayout?: (e: LayoutChangeEvent) => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  isDarkMode,
  rightComponent,
  onLayout,
}) => {
  return (
    <View
      onLayout={onLayout}
      className="px-6 py-4 flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1">
        {onBack && <BackButton onPress={onBack} isDarkMode={isDarkMode} />}
        <View className="flex-1 ml-4">
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
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent && <View>{rightComponent}</View>}
    </View>
  );
};

export default Header;
