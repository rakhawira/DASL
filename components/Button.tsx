import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "medium",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = true,
  style,
  disabled,
  ...props
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingHorizontal: 16, paddingVertical: 10 },
      medium: { paddingHorizontal: 24, paddingVertical: 16 },
      large: { paddingHorizontal: 32, paddingVertical: 20 },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: "#EF4444",
      },
      secondary: {
        backgroundColor: "#6B7280",
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#EF4444",
      },
    };

    const buttonStyle: ViewStyle = {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled || loading ? 0.7 : 1,
      width: fullWidth ? "100%" : "auto",
    };

    if (style) {
      Object.assign(buttonStyle, style);
    }

    return buttonStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: "bold",
      textAlign: "center",
    };

    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: "#FFFFFF" },
      secondary: { color: "#FFFFFF" },
      outline: { color: "#EF4444" },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const renderIcon = () => {
    if (!icon && !loading) return null;

    if (loading) {
      return (
        <Ionicons
          name="refresh"
          size={size === "small" ? 16 : size === "medium" ? 18 : 20}
          color={variant === "outline" ? "#3B82F6" : "#FFFFFF"}
          style={[styles.icon, iconPosition === "right" && styles.iconRight]}
        />
      );
    }

    if (icon) {
      return (
        <Ionicons
          name={icon as any}
          size={size === "small" ? 16 : size === "medium" ? 18 : 20}
          color={variant === "outline" ? "#3B82F6" : "#FFFFFF"}
          style={[styles.icon, iconPosition === "right" && styles.iconRight]}
        />
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      disabled={disabled || loading}
      activeOpacity={0.85}
      {...props}
    >
      {iconPosition === "left" && renderIcon()}
      <Text style={getTextStyle()}>{loading ? "Loading..." : title}</Text>
      {iconPosition === "right" && renderIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  icon: {
    marginRight: 8,
  },
  iconRight: {
    marginRight: 0,
    marginLeft: 8,
  },
});

export default Button;
