import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import ProfileTab from "../../(shared)/ProfileShared";

export default function LecturerProfilePage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Memoize props to prevent unnecessary re-renders of ProfileTab
  const props = useMemo(
    () => ({
      user,
      isDarkMode,
      language,
      showToast,
      toggleLanguage,
      toggleTheme,
    }),
    [user, isDarkMode, language, showToast, toggleLanguage, toggleTheme],
  );

  return <ProfileTab {...props} />;
}
