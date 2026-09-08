import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import NotificationShared from "../../(shared)/NotificationShared";

export default function NotificationPage() {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  return (
    <NotificationShared
      user={user}
      isDarkMode={isDarkMode}
      language={language}
      showToast={showToast}
    />
  );
}
