import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";
import React, { ReactNode, useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  redirectTo = "/(public)/(auth)/login",
}) => {
  const { isAuthenticated, isLoading, user, checkAuthStatus } = useAuth();
  const router = useRouter();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        console.log(
          "AuthGuard: Redirecting to login (requireAuth=true, isAuthenticated=false)",
        );
        router.replace(redirectTo as any);
      } else if (!requireAuth && isAuthenticated && user) {
        // Redirect to appropriate dashboard based on user role
        const dashboardRoute = getDashboardRoute(user.role);
        console.log(
          "AuthGuard: Redirecting to dashboard (requireAuth=false, isAuthenticated=true):",
          dashboardRoute,
        );
        router.replace(dashboardRoute as any);
      } else if (!requireAuth && !isAuthenticated) {
        // For login page - show loading while checking auth
        console.log(
          "AuthGuard: Showing login page (requireAuth=false, isAuthenticated=false)",
        );
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, user]);

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
        console.error("AuthGuard: Unknown user role:", role);
        return "/(public)/(auth)/login";
    }
  };

  if (isLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-white"}`}
      >
        <ActivityIndicator size="large" color="#EF4444" />
        <Text
          className={`mt-4 text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return (
      <View
        className={`flex-1 items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-white"}`}
      >
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  // If auth is not required and user is not authenticated, render children (login page)
  if (!requireAuth && !isAuthenticated) {
    return <>{children}</>;
  }

  return <>{children}</>;
};

export default AuthGuard;
