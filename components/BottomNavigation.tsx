import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

export interface TabItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface BottomNavigationProps {
  activeTab: string;
  tabs: TabItem[];
  onTabPress: (tabId: string) => void;
  isDarkMode: boolean;
  language: string;
}

export default function BottomNavigation({
  activeTab,
  tabs,
  onTabPress,
  isDarkMode,
  language,
}: BottomNavigationProps) {
  return (
    <View
      className={`absolute bottom-8 left-6 right-6 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } rounded-2xl shadow-2xl border ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <View className="flex-row items-center justify-around py-3">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 items-center justify-center py-2"
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={
                activeTab === tab.id
                  ? "#EF4444"
                  : isDarkMode
                    ? "#9CA3AF"
                    : "#6B7280"
              }
            />
            <Text
              className={`text-xs mt-1 font-medium ${
                activeTab === tab.id
                  ? "text-red-500"
                  : isDarkMode
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
