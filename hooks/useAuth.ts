import { authAPI, SessionManager } from "@/services/api";
import { User } from "@/types/user";
import { CreateUserSchema, LoginCredentialsSchema } from "@/utils/schemas";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setAuthState((prev) => {
        if (prev.isLoading) {
          console.log("Auth check timeout - forcing loading to false");
          return { ...prev, isLoading: false };
        }
        return prev;
      });
    }, 5000); // 5 second timeout

    checkAuthStatus();

    return () => clearTimeout(timeoutId);
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log("Checking auth status...");
      const session = await SessionManager.getSession();

      if (session) {
        console.log("Session found:", session);
        try {
          // Verify session is still valid by fetching current user
          const currentUser = await authAPI.getCurrentUser();
          console.log("Current user verified:", currentUser);

          if (currentUser) {
            setAuthState({
              user: currentUser,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
          } else {
            // Session invalid, clear it
            console.log("Session invalid, clearing...");
            await SessionManager.clearSession();
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            });
          }
        } catch (sessionError) {
          console.error("Session verification failed:", sessionError);
          // Clear session on verification failure
          await SessionManager.clearSession();
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } else {
        console.log("No session found");
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Auth status check failed:", error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  };

  const login = async (username: string, password: string) => {
    console.log("useAuth.login called with:", username);
    
    // Validate credentials using zod
    const validationResult = LoginCredentialsSchema.safeParse({
      username,
      password,
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid credentials";
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.login({ username, password });
      console.log("useAuth.login response:", response);

      // Handle the actual response structure from API
      if (response.success && response.data && response.data.user) {
        setAuthState({
          user: response.data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
        console.log(
          "Login successful, user state updated:",
          response.data.user,
        );
        return { success: true, user: response.data.user };
      } else {
        // Handle case where login succeeds but no user data
        const errorMessage =
          response.message || "Login successful but no user data received";
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error("useAuth.login error:", error);
      const errorMessage = error?.message || error?.error || "Login failed";

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const register = async (username: string, password: string) => {
    // Validate registration data using zod
    const validationResult = CreateUserSchema.safeParse({
      username,
      password,
      name: username, // Using username as name for simplicity
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid registration data";
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await authAPI.register({ username, password });

      setAuthState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      return { success: true, user: response.user };
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Registration failed";

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("Starting logout process");
      await authAPI.logout();
      console.log("Logout completed successfully");
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if API call fails
    } finally {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      // Redirect to login
      router.replace("/(public)/(auth)/login");
    }
  };

  const updateProfile = async (username: string) => {
    // Validate username using zod
    const validationResult = CreateUserSchema.safeParse({
      username,
      password: "dummy", // Password not required for profile update
      name: username,
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || "Invalid username";
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const updatedUser = await authAPI.updateProfile(username);

      setAuthState((prev) => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
        error: null,
      }));

      return { success: true, user: updatedUser };
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Profile update failed";

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus,
    clearError,
  };
};
