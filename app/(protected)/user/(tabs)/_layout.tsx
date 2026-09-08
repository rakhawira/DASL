import FloatingTabBar, { TabItem } from "@/components/FloatingTabBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Tabs } from "expo-router";

function UserFloatingTabBar(props: any) {
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

export default function UserTabsLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <UserFloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          freezeOnBlur: true, // Keep tab state saat blur
          lazy: true, // Load all tabs immediately
        }}
      >
        <Tabs.Screen name="HomeTab" />
        <Tabs.Screen name="AttendanceTab" />
        <Tabs.Screen name="ChatTab" />
        <Tabs.Screen name="ProfileTab" />
      </Tabs>
    </>
  );
}
