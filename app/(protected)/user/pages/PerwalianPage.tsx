import { useRouter } from "expo-router";
import React from "react";
import PerwalianShared from "../../(shared)/PerwalianShared";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";

export default function PerwalianPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  return (
    <PerwalianShared
      user={user}
      isDarkMode={isDarkMode}
      language={language}
      showToast={showToast}
      isLecturer={false}
      onClose={() => router.back()}
    />
  );
}
