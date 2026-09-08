import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    placeholder: string;
    shadow: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("darkMode");
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === "true");
      }
    } catch (error) {
      console.log("Error loading theme preference:", error);
    }
  };

  const saveThemePreference = async (darkMode: boolean) => {
    try {
      await AsyncStorage.setItem("darkMode", darkMode.toString());
    } catch (error) {
      console.log("Error saving theme preference:", error);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    saveThemePreference(newDarkMode);
  };

  const colors = {
    primary: "#3B82F6",
    secondary: "#6B7280",
    background: isDarkMode ? "#111827" : "#FFFFFF",
    card: isDarkMode ? "#1F2937" : "#FFFFFF",
    text: isDarkMode ? "#F9FAFB" : "#111827",
    textSecondary: isDarkMode ? "#D1D5DB" : "#6B7280",
    border: isDarkMode ? "#374151" : "#E5E7EB",
    placeholder: isDarkMode ? "#6B7280" : "#9CA3AF",
    shadow: isDarkMode ? "#000000" : "#3B82F6",
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
