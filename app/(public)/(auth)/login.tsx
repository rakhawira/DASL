import AuthGuard from "@/components/AuthGuard";
import Button from "@/components/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { LoginCredentialsSchema } from "@/utils/schemas";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNIM, setIsNIM] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const { language } = useLanguage();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { showToast, toast, hideToast } = useToast();
  const { login: authLogin } = useAuth();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const gatewayPosition = useRef(new Animated.Value(0)).current;

  // Load remembered user on component mount and clear any existing toast
  useEffect(() => {
    hideToast(); // Clear any ghost toast from previous session
    loadRememberedUser();
  }, []);

  const loadRememberedUser = async () => {
    try {
      console.log("Loading remembered user...");
      const rememberedUser = await AsyncStorage.getItem("rememberedUser");
      console.log("Found remembered user:", rememberedUser);
      if (rememberedUser) {
        const user = JSON.parse(rememberedUser);
        setUsername(user.username);
        setRememberMe(true);
        console.log("Set username to:", user.username);
        // Don't auto-fill password for security reasons
      }
    } catch (error) {
      console.log("Error loading remembered user:", error);
    }
  };

  const saveRememberedUser = async (username: string, remember: boolean) => {
    try {
      console.log("Saving remembered user:", username, "remember:", remember);
      if (remember) {
        await AsyncStorage.setItem(
          "rememberedUser",
          JSON.stringify({ username }),
        );
        console.log("User saved successfully");
      } else {
        await AsyncStorage.removeItem("rememberedUser");
        console.log("Remembered user removed");
      }
    } catch (error) {
      console.log("Error saving remembered user:", error);
    }
  };

  const handleLogin = async () => {
    // Validate using zod schema
    const validationResult = LoginCredentialsSchema.safeParse({
      username,
      password,
    });

    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.issues[0]?.message ||
        (language === "EN"
          ? "Please fill in all fields"
          : "Harap isi semua field");
      showToast(errorMessage, "error");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting login with:", { username, password: "********" });

      // Use the auth login function from useAuth hook
      const loginResult = await authLogin(username, password);

      console.log("Login successful:", loginResult);

      if (loginResult.success && loginResult.user) {
        // Successful login
        showToast(
          language === "EN"
            ? `Welcome back, ${loginResult.user.name || loginResult.user.username}!`
            : `Selamat datang kembali, ${loginResult.user.name || loginResult.user.username}!`,
          "success",
        );

        // Save user if remember me is checked
        await saveRememberedUser(username, rememberMe);

        // Redirect based on user role
        setTimeout(() => {
          if (loginResult.user?.role === "admin") {
            router.replace("/admin/dashboard");
          } else if (loginResult.user?.role === "dosen") {
            router.replace("/lecturer/dashboard");
          } else if (loginResult.user?.role === "mahasiswa") {
            router.replace("/user/dashboard");
          } else {
            // Handle unknown role - show error instead of fallback
            showToast(
              language === "EN"
                ? "Unknown user role. Please contact administrator."
                : "Role pengguna tidak dikenal. Silakan hubungi administrator.",
              "error",
            );
            console.error("Unknown user role:", loginResult.user?.role);
          }
        }, 1000);
      } else {
        // Login failed
        showToast(
          loginResult.error ||
            (language === "EN"
              ? "Login failed. Please try again."
              : "Login gagal. Silakan coba lagi."),
          "error",
        );
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);

      let errorMessage =
        language === "EN"
          ? "Login failed. Please try again."
          : "Login gagal. Silakan coba lagi.";

      if (error instanceof Error) {
        if (error.message.includes("Invalid username or password")) {
          errorMessage =
            language === "EN"
              ? "Invalid username or password"
              : "Username atau password tidak valid";
        } else if (
          error.message.includes("Network error") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            language === "EN"
              ? "Network error. Please check your connection."
              : "Error jaringan. Silakan periksa koneksi Anda.";
        } else {
          errorMessage = error.message;
        }
      }

      // Handle axios error response
      if (error.response) {
        const errorData = error.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      }

      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBottomSheet = () => {
    setIsBottomSheetOpen(true);
    bottomSheetRef.current?.expand();
  };

  const handleBottomSheetChange = (index: number) => {
    setIsBottomSheetOpen(index > -1);
  };

  useEffect(() => {
    Animated.timing(gatewayPosition, {
      toValue: isBottomSheetOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isBottomSheetOpen]);

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      opacity={0.5}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
    />
  );

  return (
    <AuthGuard requireAuth={false}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaViewComponent
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          edges={["top", "left", "right"]}
        >
          <StatusBar style="auto" animated={true} />
          <View
            className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          >
            {/* Top decorative section */}
            <Animated.View
              className="flex-1 justify-center"
              style={{
                transform: [
                  {
                    translateY: gatewayPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -200],
                    }),
                  },
                ],
              }}
            >
              <View className="items-center px-4">
                <View className={`${isDarkMode ? "bg-white" : "bg-gray-700"} w-20 h-20 md:w-24 md:h-24 rounded-full items-center justify-center mb-4 md:mb-6 shadow-lg`}>
                  <Ionicons name="shield-checkmark" size={48} color="#EF4444" />
                </View>
                <Text className={`${isDarkMode ? "white" : "gray-700"} md:text-4xl font-bold text-3xl mb-2 text-center`}>
                  DASL Gateway
                </Text>
                <Text
                  className={`${isDarkMode ? "white" : "gray-700"} text-center text-base md:text-lg px-4`}
                >
                  {language === "EN"
                    ? "Dinamika Attendance Synchronize Log"
                    : "Catatan Sinkronisasi Kehadiran Dinamika"}
                </Text>
              </View>
            </Animated.View>

            {/* Footer with Start Button */}
            <View className="px-6 pb-8 pt-4">
              <Button
                title={language === "EN" ? "Start" : "Mulai"}
                size="large"
                onPress={handleOpenBottomSheet}
              />
            </View>
          </View>

          {/* Bottom Sheet */}
          <BottomSheet
            ref={bottomSheetRef}
            enableDynamicSizing={true}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            enablePanDownToClose={true}
            onChange={handleBottomSheetChange}
            backdropComponent={renderBackdrop}
            backgroundStyle={{
              backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
            }}
            handleIndicatorStyle={{
              backgroundColor: isDarkMode ? "#4B5563" : "#D1D5DB",
            }}
          >
            <BottomSheetView className="px-6 md:px-8 pt-6 pb-8">
              <View className="mb-6">
                <Text
                  className={`text-2xl md:text-3xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}
                >
                  {language === "EN"
                    ? "Welcome Back"
                    : "Selamat Datang Kembali"}
                </Text>
                <Text
                  className={`text-sm md:text-base leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
                >
                  {language === "EN"
                    ? "Enter your credentials to access your secure account"
                    : "Masukkan kredensial Anda untuk mengakses akun aman Anda"}
                </Text>
              </View>

              <View className="space-y-4">
                <View>
                  <Text
                    className={`mb-3 font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    {language === "EN" ? "NIM/NIP" : "NIM/NIP"}
                  </Text>
                  <View
                    className={`flex-row items-center rounded-2xl px-4 py-4 border shadow-md ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="person-outline"
                      size={22}
                      color={isDarkMode ? "#60A5FA" : "#3B82F6"}
                      style={{ marginRight: 12 }}
                    />
                    <BottomSheetTextInput
                      className={`flex-1 text-base ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      placeholder={
                        language === "EN" ? "Enter NIM/NIP" : "Masukkan NIM/NIP"
                      }
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#D1D5DB"}
                      value={username}
                      onChangeText={setUsername}
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ minHeight: 24 }}
                    />
                  </View>
                </View>

                <View className="mt-6">
                  <Text
                    className={`mb-3 font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}
                  >
                    {language === "EN" ? "Password" : "Kata Sandi"}
                  </Text>
                  <View
                    className={`flex-row items-center rounded-2xl px-4 py-4 border shadow-md ${
                      isDarkMode
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={22}
                      color={isDarkMode ? "#60A5FA" : "#3B82F6"}
                      style={{ marginRight: 12 }}
                    />
                    <BottomSheetTextInput
                      className={`flex-1 text-base ${isDarkMode ? "text-white" : "text-gray-800"}`}
                      placeholder={
                        language === "EN"
                          ? "Enter your password"
                          : "Masukkan kata sandi Anda"
                      }
                      placeholderTextColor={isDarkMode ? "#9CA3AF" : "#D1D5DB"}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={{ minHeight: 24 }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ marginLeft: 12, padding: 4 }}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Remember Me Checkbox */}
              <View className="flex-row items-center mt-4 mb-2">
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-5 h-5 rounded items-center justify-center mr-3 border-2 ${
                      rememberMe
                        ? "bg-blue-600 border-blue-600"
                        : isDarkMode
                          ? "border-gray-600"
                          : "border-gray-400"
                    }`}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-medium ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {language === "EN" ? "Remember me" : "Ingat saya"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title={language === "EN" ? "Sign In" : "Masuk"}
                size="large"
                loading={isLoading}
                onPress={handleLogin}
                style={{ marginTop: 24 }}
              />
            </BottomSheetView>
          </BottomSheet>
        </SafeAreaViewComponent>
      </GestureHandlerRootView>
    </AuthGuard>
  );
}
