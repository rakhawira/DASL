import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAttendancePolling } from "@/hooks/useAttendancePolling";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import AttendanceTab from "../../(shared)/AttendanceShared";

export default function UserAttendancePage() {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isPollingEnabled = useAttendancePolling();

  // Memoize props to prevent unnecessary re-renders of AttendanceTab
  const props = useMemo(
    () => ({
      user,
      isDarkMode,
      language,
      showToast,
      isPollingEnabled,
      role: "user" as const,
    }),
    [user, isDarkMode, language, showToast, isPollingEnabled],
  );

  return <AttendanceTab {...props} />;
}
