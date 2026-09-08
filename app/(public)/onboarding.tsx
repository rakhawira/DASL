import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type Language = "EN" | "ID";

interface OnboardingSlide {
  id: string;
  type: "language" | "theme" | "content";
  icon?: keyof typeof Ionicons.glyphMap;
  titleEN?: string;
  titleID?: string;
  descriptionEN?: string;
  descriptionID?: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "0",
    type: "language",
  },
  {
    id: "1",
    type: "theme",
  },
  {
    id: "2",
    type: "content",
    icon: "qr-code-outline",
    titleEN: "Smart Attendance",
    titleID: "Absensi Cerdas",
    descriptionEN: "Track attendance easily using QR codes or NFC technology.",
    descriptionID:
      "Lacak kehadiran dengan mudah menggunakan QR code atau teknologi NFC.",
  },
  {
    id: "3",
    type: "content",
    icon: "calendar-outline",
    titleEN: "Schedule Management",
    titleID: "Manajemen Jadwal",
    descriptionEN: "View and manage your class schedules in real-time.",
    descriptionID: "Lihat dan kelola jadwal kelas Anda secara real-time.",
  },
  {
    id: "4",
    type: "content",
    icon: "notifications-outline",
    titleEN: "Stay Notified",
    titleID: "Tetap Terinformasi",
    descriptionEN:
      "Get instant notifications for upcoming classes, attendance confirmations, and important announcements.",
    descriptionID:
      "Dapatkan notifikasi instan untuk kelas mendatang, konfirmasi kehadiran, dan pengumuman penting.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>("EN");
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("light");
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalSlides = ONBOARDING_SLIDES.length;

  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  useEffect(() => {
    setSelectedTheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const animateProgress = (index: number) => {
    Animated.timing(progressAnim, {
      toValue: (index + 1) / totalSlides,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
  };

  const handleThemeSelect = (theme: "light" | "dark") => {
    setSelectedTheme(theme);
    if (theme === "dark" && !isDarkMode) {
      toggleTheme();
    } else if (theme === "light" && isDarkMode) {
      toggleTheme();
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      const nextSlide = currentSlide + 1;
      flatListRef.current?.scrollToIndex({ index: nextSlide, animated: true });
      setCurrentSlide(nextSlide);
      animateProgress(nextSlide);
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/login");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number }> }) => {
      if (viewableItems[0]?.index !== undefined) {
        const index = viewableItems[0].index;
        setCurrentSlide(index);
        animateProgress(index);
      }
    },
  ).current;

  const renderLanguageSlide = () => (
    <View className="flex-1 px-6 py-8">
      <View className="mb-6">
        <Text
          className={`text-3xl font-bold text-center ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          {selectedLanguage === "EN" ? "Select Language" : "Pilih Bahasa"}
        </Text>
        <Text
          className={`text-lg text-center mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          {selectedLanguage === "EN"
            ? "Choose your preferred language"
            : "Pilih bahasa Pilihan Anda"}
        </Text>
      </View>

      <View className="flex-1 justify-center gap-3">
        <TouchableOpacity
          onPress={() => handleLanguageSelect("EN")}
          className={`p-6 rounded-2xl border-2 flex-row items-center justify-between ${
            selectedLanguage === "EN"
              ? isDarkMode
                ? "border-red-500 bg-red-900/30"
                : "border-red-500 bg-red-50"
              : isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDarkMode ? "bg-red-900" : "bg-red-100"
              }`}
            >
              <Ionicons
                name="language-outline"
                size={24}
                color={isDarkMode ? "#F87171" : "#EF4444"}
              />
            </View>
            <View className="ml-4">
              <Text
                className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                English
              </Text>
              <Text
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {selectedLanguage === "EN" ? "Selected" : "Bahasa Utama"}
              </Text>
            </View>
          </View>
          {selectedLanguage === "EN" && (
            <Ionicons name="checkmark-circle" size={28} color="#EF4444" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleLanguageSelect("ID")}
          className={`p-6 rounded-2xl border-2 flex-row items-center justify-between ${
            selectedLanguage === "ID"
              ? isDarkMode
                ? "border-red-500 bg-red-900/30"
                : "border-red-500 bg-red-50"
              : isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isDarkMode ? "bg-red-900" : "bg-red-100"
              }`}
            >
              <Ionicons
                name="language-outline"
                size={24}
                color={isDarkMode ? "#F87171" : "#EF4444"}
              />
            </View>
            <View className="ml-4">
              <Text
                className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                Bahasa Indonesia
              </Text>
              <Text
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {selectedLanguage === "ID" ? "Terpilih" : "Indonesian"}
              </Text>
            </View>
          </View>
          {selectedLanguage === "ID" && (
            <Ionicons name="checkmark-circle" size={28} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderThemeSlide = () => (
    <View className="flex-1 px-6 py-8">
      <View className="mb-6">
        <Text
          className={`text-3xl font-bold text-center ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          {selectedLanguage === "EN" ? "Choose Theme" : "Pilih Tema"}
        </Text>
        <Text
          className={`text-lg text-center mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          {selectedLanguage === "EN"
            ? "Select your preferred appearance"
            : "Pilih tampilan pilihan anda"}
        </Text>
      </View>

      <View className="flex-1 justify-center gap-3">
        <TouchableOpacity
          onPress={() => handleThemeSelect("light")}
          className={`p-6 rounded-2xl border-2 flex-row items-center justify-between ${
            selectedTheme === "light"
              ? "border-red-500 bg-red-50"
              : isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${selectedTheme === "light" ? "bg-red-100" : "bg-yellow-100"}`}
            >
              <Ionicons
                name="sunny-outline"
                size={24}
                color={selectedTheme === "light" ? "#EF4444" : "#F59E0B"}
              />
            </View>
            <View className="ml-4">
              <Text
                className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {selectedLanguage === "EN" ? "Light Mode" : "Mode Terang"}
              </Text>
              <Text
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {selectedLanguage === "EN"
                  ? "Bright and clear"
                  : "Terang dan jelas"}
              </Text>
            </View>
          </View>
          {selectedTheme === "light" && (
            <Ionicons name="checkmark-circle" size={28} color="#EF4444" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeSelect("dark")}
          className={`p-6 rounded-2xl border-2 flex-row items-center justify-between ${
            selectedTheme === "dark"
              ? "border-red-500 bg-red-900/20"
              : isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${selectedTheme === "dark" ? "bg-red-900" : "bg-gray-100"}`}
            >
              <Ionicons
                name="moon-outline"
                size={24}
                color={selectedTheme === "dark" ? "#EF4444" : "#6B7280"}
              />
            </View>
            <View className="ml-4">
              <Text
                className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              >
                {selectedLanguage === "EN" ? "Dark Mode" : "Mode Gelap"}
              </Text>
              <Text
                className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {selectedLanguage === "EN"
                  ? "Easy on the eyes"
                  : "Nyaman untuk mata"}
              </Text>
            </View>
          </View>
          {selectedTheme === "dark" && (
            <Ionicons name="checkmark-circle" size={28} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContentSlide = ({ item }: { item: OnboardingSlide }) => (
    <View className="flex-1 items-center justify-center px-6 py-8">
      <View
        className={`w-40 h-40 rounded-full items-center justify-center mb-8 ${isDarkMode ? "bg-red-900/30" : "bg-red-100"}`}
      >
        <Ionicons
          name={item.icon}
          size={80}
          color={isDarkMode ? "#F87171" : "#EF4444"}
        />
      </View>

      <Text
        className={`text-2xl font-bold text-center mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
      >
        {selectedLanguage === "EN" ? item.titleEN : item.titleID}
      </Text>

      <Text
        className={`text-center text-base px-4 leading-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
      >
        {selectedLanguage === "EN" ? item.descriptionEN : item.descriptionID}
      </Text>
    </View>
  );

  const renderSlide = ({
    item,
    index,
  }: {
    item: OnboardingSlide;
    index: number;
  }) => {
    return (
      <View style={{ width }} className="flex-1">
        {item.type === "language" && renderLanguageSlide()}
        {item.type === "theme" && renderThemeSlide()}
        {item.type === "content" && renderContentSlide({ item })}
      </View>
    );
  };

  const getButtonText = () => {
    if (currentSlide === totalSlides - 1) {
      return selectedLanguage === "EN" ? "Get Started" : "Mulai";
    }
    return selectedLanguage === "EN" ? "Next" : "Lanjut";
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-white"}`}
      style={{ backgroundColor: colors.background }}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Skip button - hide on language and theme slides */}
      {currentSlide >= 2 && (
        <View className="flex-row justify-end px-6 pt-12 pb-4">
          <TouchableOpacity onPress={handleSkip}>
            <Text
              className={`text-base ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              {selectedLanguage === "EN" ? "Skip" : "Lewati"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Spacer for language/theme slides */}
      {currentSlide < 2 && <View className="h-12" />}

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View className="px-6 pb-8">
        {/* Progress dots */}
        <View className="flex-row justify-center mb-6">
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                index === currentSlide
                  ? "bg-red-500 w-6"
                  : isDarkMode
                    ? "bg-gray-700 w-2"
                    : "bg-gray-300 w-2"
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNextSlide}
          className="bg-red-500 py-4 rounded-2xl items-center"
        >
          <Text className="text-white text-lg font-semibold">
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaViewComponent>
  );
}
