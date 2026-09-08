import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from "react-native";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
  onHide: () => void;
  visibilityTime?: number;
  swipeEnable?: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  visible,
  onHide,
  visibilityTime = 3000,
  swipeEnable = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      translateX.setValue(0);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHideRef.current());
      }, visibilityTime);

      return () => clearTimeout(timer);
    }
  }, [visible, visibilityTime]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => swipeEnable,
      onPanResponderMove: (_, gestureState) => {
        if (swipeEnable) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!swipeEnable) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          return;
        }

        if (Math.abs(gestureState.dx) > 100) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? 500 : -500,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            translateX.setValue(0);
            onHideRef.current();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "#10B981",
          icon: "checkmark-circle",
        };
      case "error":
        return {
          backgroundColor: "#EF4444",
          icon: "close-circle",
        };
      case "info":
        return {
          backgroundColor: "#3B82F6",
          icon: "information-circle",
        };
      default:
        return {
          backgroundColor: "#6B7280",
          icon: "information-circle",
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <View style={styles.overlay}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.toast,
          {
            backgroundColor: toastStyle.backgroundColor,
            opacity: fadeAnim,
            transform: [{ translateX }],
          },
        ]}
      >
        <Ionicons
          name={toastStyle.icon as any}
          size={20}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    maxWidth: Dimensions.get("window").width - 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});

export default Toast;
