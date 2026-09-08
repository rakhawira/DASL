import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();
  const { isDarkMode, colors } = useTheme();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { refreshAll } = useRefresh();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      if (hasSeenOnboarding === null) {
        setIsFirstLaunch(true);
        router.replace("/onboarding");
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      console.error("Error checking first launch:", error);
      setIsFirstLaunch(false);
    }
  };

  useEffect(() => {
    // Only redirect after authentication check is complete and not first launch
    if (!isLoading && isFirstLaunch === false) {
      if (isAuthenticated && user) {
        // Trigger automatic refresh when user is authenticated
        refreshAll().catch((error: any) => {
          console.error("Error during automatic refresh:", error);
        });

        // User is authenticated, redirect to appropriate dashboard based on role
        const dashboardRoute = getDashboardRoute(user.role);
        router.replace(dashboardRoute);
      } else {
        // User is not authenticated, redirect to login
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router, refreshAll, isFirstLaunch]);

  // Helper function to get dashboard route based on user role
  const getDashboardRoute = (role: string) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "dosen":
        return "/lecturer/dashboard";
      case "staff":
        return "/lecturer/dashboard";
      case "mahasiswa":
        return "/user/dashboard";
      default:
        // Log unknown role and redirect to login for safety
        console.error("Index: Unknown user role:", role);
        return "/login";
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      {/* Loading placeholder while checking authentication */}
    </View>
  );
}
