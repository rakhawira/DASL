import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Text } from "react-native";

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  activeColor: string;
  inactiveColor: string;
  icon?: {
    left?: {
      name: keyof typeof Ionicons.glyphMap;
      color?: string;
    };
    right?: {
      name: keyof typeof Ionicons.glyphMap;
      color?: string;
    };
  };
  disabled?: boolean;
}

export default function ToggleSwitch({
  value,
  onValueChange,
  leftLabel,
  rightLabel,
  activeColor,
  inactiveColor,
  icon,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <TouchableOpacity
      className={`w-16 h-8 rounded-full ${
        value ? activeColor : inactiveColor
      } relative transition-colors duration-200`}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View
        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
          value ? "translate-x-9" : "translate-x-1"
        }`}
      />
      <View className="flex-1 flex-row justify-between items-center px-2">
        {icon?.left ? (
          <Ionicons
            name={icon.left.name}
            size={12}
            color={value ? "text-gray-800" : icon.left.color || "text-white"}
          />
        ) : (
          <Text
            className={`text-xs font-bold ${
              !value ? "text-gray-800" : "text-white"
            }`}
          >
            {leftLabel}
          </Text>
        )}
        {icon?.right ? (
          <Ionicons
            name={icon.right.name}
            size={12}
            color={value ? icon.right.color || "text-gray-800" : "text-white"}
          />
        ) : (
          <Text
            className={`text-xs font-bold ${
              value ? "text-gray-800" : "text-white"
            }`}
          >
            {rightLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
