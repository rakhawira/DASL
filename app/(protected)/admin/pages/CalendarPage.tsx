import { useRouter } from "expo-router";
import React from "react";
import CalendarShared from "../../(shared)/CalendarShared";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";

export default function CalendarPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const handleBack = () => {
    router.back();
  };

  return (
    <CalendarShared
      user={user}
      isDarkMode={isDarkMode}
      language={language}
      showToast={showToast}
      isModal={false}
      onClose={handleBack}
    />
  );
}
