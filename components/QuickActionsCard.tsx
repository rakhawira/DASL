import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface QuickAction {
  id: string;
  title: string;
  titleId: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface QuickActionsCardProps {
  quickActions: QuickAction[];
  isDarkMode: boolean;
  language: "EN" | "ID";
  title?: string;
  titleId?: string;
}

export default function QuickActionsCard({
  quickActions,
  isDarkMode,
  language,
  title = "Quick Actions",
  titleId = "Aksi Cepat",
}: QuickActionsCardProps) {
  return (
    <View className="px-6 mb-6">
      <Text
        className={`text-lg font-bold mb-3 ${
          isDarkMode ? "text-white" : "text-gray-800"
        }`}
      >
        {language === "EN" ? title : titleId}
      </Text>
      <View className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            className={`p-4 rounded-xl flex-row items-center justify-between ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name={action.icon} size={24} color={action.color} />
              <Text
                className={`ml-3 font-medium ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN" ? action.title : action.titleId}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
