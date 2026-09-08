import { useRouter } from "expo-router";
import { useMemo } from "react";
import ViewLogsShared from "../../(shared)/ViewLogsShared";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";

export default function ViewLogsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const searchFields = useMemo<
    ("location" | "name" | "username" | "jurusan" | "status")[]
  >(() => ["location"], []);

  return (
    <ViewLogsShared
      isDarkMode={isDarkMode}
      language={language}
      showToast={showToast}
      onBack={() => router.back()}
      user={user}
      filterByUser={true}
      searchPlaceholderEN="Search by location..."
      searchPlaceholderID="Cari berdasarkan lokasi..."
      searchFields={searchFields}
    />
  );
}
