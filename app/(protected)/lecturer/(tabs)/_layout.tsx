import FloatingTabBar, { TabItem } from "@/components/FloatingTabBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Tabs } from "expo-router";

function LecturerFloatingTabBar(props: any) {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();

  const tabs: TabItem[] = [
    {
      key: "HomeTab",
      icon: "home-outline",
      activeIcon: "home",
      label: language === "EN" ? "Home" : "Beranda",
    },
    {
      key: "ScheduleTab",
      icon: "calendar-outline",
      activeIcon: "calendar",
      label: language === "EN" ? "Schedule" : "Jadwal",
    },
    {
      key: "AttendanceTab",
      icon: "finger-print-outline",
      activeIcon: "finger-print",
      label: language === "EN" ? "Attendance" : "Kehadiran",
    },
    {
      key: "ChatTab",
      icon: "chatbubble-outline",
      activeIcon: "chatbubble",
      label: language === "EN" ? "Chat" : "Chat",
    },
    {
      key: "ProfileTab",
      icon: "person-outline",
      activeIcon: "person",
      label: language === "EN" ? "Profile" : "Profil",
    },
  ];

  return <FloatingTabBar {...props} tabs={tabs} isDarkMode={isDarkMode} />;
}

export default function LecturerTabsLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <LecturerFloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          freezeOnBlur: false, // Keep tab state saat blur
        }}
      >
        <Tabs.Screen name="HomeTab" />
        <Tabs.Screen name="ScheduleTab" />
        <Tabs.Screen name="AttendanceTab" />
        <Tabs.Screen name="ChatTab" />
        <Tabs.Screen name="ProfileTab" />
      </Tabs>
    </>
  );
}
