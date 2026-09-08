import { useRouter } from "expo-router";
import ViewLogsShared from "../../(shared)/ViewLogsShared";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";

export default function ViewLogsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  return (
    <ViewLogsShared
      isDarkMode={isDarkMode}
      language={language}
      showToast={showToast}
      onBack={() => router.back()}
    />
  );
}
