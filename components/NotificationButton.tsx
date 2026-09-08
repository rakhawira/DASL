import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, TouchableOpacity } from "react-native";

interface NotificationButtonProps {
  isDarkMode: boolean;
  onPress: () => void;
  hasNotification?: boolean;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  isDarkMode,
  onPress,
  hasNotification = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dotScaleAnim = useRef(
    new Animated.Value(hasNotification ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.timing(dotScaleAnim, {
      toValue: hasNotification ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [hasNotification]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      className="relative"
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
        className={`w-10 h-10 rounded-2xl items-center justify-center ${
          isDarkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
      </Animated.View>
      {hasNotification && (
        <Animated.View
          style={{
            transform: [{ scale: dotScaleAnim }],
          }}
          className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
        />
      )}
    </TouchableOpacity>
  );
};

export default NotificationButton;
