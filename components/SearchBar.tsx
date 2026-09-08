import { Ionicons } from "@expo/vector-icons";
import {
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderEN?: string;
  placeholderID?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showClearButton?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  onClear?: () => void;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholderEN,
  placeholderID,
  isDarkMode,
  language,
  showClearButton = true,
  containerStyle,
  inputStyle,
  onClear,
}: SearchBarProps) {
  const placeholder = language === "EN" ? placeholderEN : placeholderID;

  const handleClear = () => {
    onChangeText("");
    onClear?.();
  };

  return (
    <View
      className={`flex-row items-center px-4 py-3 rounded-xl ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md`}
      style={containerStyle}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
      <TextInput
        className="ml-3 flex-1"
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
        value={value}
        onChangeText={onChangeText}
        style={[
          {
            color: isDarkMode ? "#FFFFFF" : "#000000",
          },
          inputStyle,
        ]}
      />
      {showClearButton && value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          className="ml-2 p-1"
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle-outline"
            size={18}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
