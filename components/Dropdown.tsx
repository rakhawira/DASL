import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { DropdownProps, TimePickerProps } from "../types/dropdown";

export default function Dropdown({
  options,
  selectedValue,
  onValueChange,
  placeholder,
  placeholderEN,
  placeholderID,
  isDarkMode,
  language,
  className = "",
  disabled = false,
}: DropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const getDisplayText = () => {
    if (!selectedValue) {
      return language === "EN"
        ? placeholderEN || placeholder || "Select option"
        : placeholderID || placeholder || "Pilih opsi";
    }

    const selectedOption = options.find(
      (option) => option.value === selectedValue,
    );
    if (!selectedOption) return selectedValue;

    if (typeof selectedOption.label === "string") {
      return selectedOption.label;
    } else {
      return selectedOption.label[language] || selectedValue;
    }
  };

  const handleSelect = (value: string) => {
    onValueChange(value);
    setShowDropdown(false);
  };

  return (
    <View className={`relative ${className}`}>
      <TouchableOpacity
        onPress={() => !disabled && setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`p-4 rounded-lg border flex-row justify-between items-center ${
          disabled
            ? isDarkMode
              ? "bg-gray-900 border-gray-700 opacity-50"
              : "bg-gray-100 border-gray-200 opacity-50"
            : isDarkMode
              ? "bg-gray-800 border-gray-600 text-white"
              : "bg-gray-50 border-gray-300 text-gray-800"
        }`}
      >
        <Text
          className={`flex-1 ${
            !selectedValue
              ? isDarkMode
                ? "text-gray-400"
                : "text-gray-500"
              : isDarkMode
                ? "text-white"
                : "text-gray-800"
          }`}
        >
          {getDisplayText()}
        </Text>
        <Ionicons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={20}
          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
        />
      </TouchableOpacity>

      {showDropdown && !disabled && (
        <View
          className={`absolute top-full left-0 right-0 mt-1 rounded-lg border z-50 ${
            isDarkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-gray-300"
          }`}
          style={{ maxHeight: 125 }}
        >
          <ScrollView
            style={{ maxHeight: 125 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            onStartShouldSetResponder={() => true}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className={`p-3 border-b ${
                  isDarkMode ? "border-gray-700" : "border-gray-200"
                } ${selectedValue === option.value ? "bg-blue-500" : ""}`}
              >
                <Text
                  className={`${
                    selectedValue === option.value
                      ? "text-white"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-800"
                  }`}
                >
                  {typeof option.label === "string"
                    ? option.label
                    : option.label[language] || option.value}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Time Picker Component (for hour:minute selection)
export const TimePicker = ({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  isDarkMode,
  language,
  labelEN = "Time",
  labelID = "Waktu",
}: TimePickerProps) => {
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });

  return (
    <View className="flex-1">
      <Text
        className={`text-xs mb-1 ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {language === "EN" ? labelEN : labelID}
      </Text>
      <View className="flex-row gap-1">
        {/* Hour Dropdown */}
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              setShowHourDropdown(!showHourDropdown);
              setShowMinuteDropdown(false);
            }}
            className={`p-3 rounded-lg border flex-row justify-between items-center ${
              isDarkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-gray-50 border-gray-300"
            }`}
          >
            <Text
              className={`${
                !selectedHour
                  ? isDarkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                  : isDarkMode
                    ? "text-white"
                    : "text-gray-800"
              }`}
            >
              {selectedHour || "HH"}
            </Text>
            <Ionicons
              name={showHourDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
          {showHourDropdown && (
            <View
              className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
              style={{ maxHeight: 125 }}
            >
              <ScrollView
                style={{ maxHeight: 125 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                onStartShouldSetResponder={() => true}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {hourOptions.map((h) => (
                  <TouchableOpacity
                    key={h.value}
                    onPress={() => {
                      onHourChange(h.value);
                      setShowHourDropdown(false);
                    }}
                    className={`p-3 border-b ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    } ${selectedHour === h.value ? "bg-blue-500" : ""}`}
                  >
                    <Text
                      className={`text-center ${
                        selectedHour === h.value
                          ? "text-white"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <Text
          className={`self-center ${isDarkMode ? "text-white" : "text-gray-800"}`}
        >
          :
        </Text>
        {/* Minute Dropdown */}
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => {
              setShowMinuteDropdown(!showMinuteDropdown);
              setShowHourDropdown(false);
            }}
            className={`p-3 rounded-lg border flex-row justify-between items-center ${
              isDarkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-gray-50 border-gray-300"
            }`}
          >
            <Text
              className={`${
                !selectedMinute
                  ? isDarkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                  : isDarkMode
                    ? "text-white"
                    : "text-gray-800"
              }`}
            >
              {selectedMinute || "MM"}
            </Text>
            <Ionicons
              name={showMinuteDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
          {showMinuteDropdown && (
            <View
              className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
              style={{ maxHeight: 125 }}
            >
              <ScrollView
                style={{ maxHeight: 125 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                onStartShouldSetResponder={() => true}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {minuteOptions.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => {
                      onMinuteChange(m.value);
                      setShowMinuteDropdown(false);
                    }}
                    className={`p-3 border-b ${
                      isDarkMode ? "border-gray-700" : "border-gray-200"
                    } ${selectedMinute === m.value ? "bg-blue-500" : ""}`}
                  >
                    <Text
                      className={`text-center ${
                        selectedMinute === m.value
                          ? "text-white"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
