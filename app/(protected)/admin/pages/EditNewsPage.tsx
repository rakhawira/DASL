import Header from "@/components/Header";
import {
  DAYS,
  HOURS,
  MINUTES,
  MONTHS,
  NEWS_CATEGORIES,
  generateYears,
} from "@/constants/newsConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { getNewsById, updateNews } from "@/services/api";
import { News, UpdateNews } from "@/types/news";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function EditNewsTab() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams<{ newsId: string }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refreshSpecific } = useRefresh();

  const [newsItem, setNewsItem] = useState<
    (News & { isActive: boolean }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateNews>({
    title: "",
    content: "",
    category: "" as any,
    author: user?.name || "",
    event_date: "",
    event_start_time: "",
    event_end_time: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStartHourDropdown, setShowStartHourDropdown] = useState(false);
  const [showStartMinuteDropdown, setShowStartMinuteDropdown] = useState(false);
  const [showEndHourDropdown, setShowEndHourDropdown] = useState(false);
  const [showEndMinuteDropdown, setShowEndMinuteDropdown] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedStartHour, setSelectedStartHour] = useState("");
  const [selectedStartMinute, setSelectedStartMinute] = useState("");
  const [selectedEndHour, setSelectedEndHour] = useState("");
  const [selectedEndMinute, setSelectedEndMinute] = useState("");

  // Fetch news data on mount
  useEffect(() => {
    fetchNews();
  }, [newsId]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await getNewsById(newsId as string);
      if (response.success && response.data) {
        const item = response.data;
        setNewsItem(item);
        setFormData({
          title: item.title || "",
          content: item.content || "",
          category:
            (item.category as "announcement" | "event" | "news" | "academic") ||
            "news",
          author: item.author || "",
          event_date: item.event_date || "",
          event_start_time: item.event_start_time || "",
          event_end_time: item.event_end_time || "",
        });

        // Parse existing event_date if present
        if (item.event_date) {
          // Handle both date strings (YYYY-MM-DD) and timestamps (YYYY-MM-DDTHH:MM:SS.sssZ)
          const dateOnly = item.event_date.split("T")[0];
          const dateParts = dateOnly.split("-");
          if (dateParts.length === 3) {
            setSelectedYear(dateParts[0]);
            setSelectedMonth(dateParts[1]);
            setSelectedDay(dateParts[2]);
          }
        }

        // Parse existing event_start_time if present
        if (item.event_start_time) {
          const timeParts = item.event_start_time.split(":");
          if (timeParts.length >= 2) {
            setSelectedStartHour(timeParts[0]);
            setSelectedStartMinute(timeParts[1]);
          }
        }

        // Parse existing event_end_time if present
        if (item.event_end_time) {
          const timeParts = item.event_end_time.split(":");
          if (timeParts.length >= 2) {
            setSelectedEndHour(timeParts[0]);
            setSelectedEndMinute(timeParts[1]);
          }
        }
      } else {
        showToast(
          language === "EN" ? "Failed to load news" : "Gagal memuat berita",
          "error",
        );
        router.back();
      }
    } catch (error) {
      showToast(
        language === "EN" ? "Error loading news" : "Error memuat berita",
        "error",
      );
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const years = generateYears();

  const handleUpdateNews = async () => {
    if (
      !formData.title?.trim() ||
      !formData.content?.trim() ||
      !formData.category
    ) {
      showToast(
        language === "EN"
          ? "Please fill in all required fields"
          : "Harap isi semua field yang wajib",
        "error",
      );
      return;
    }

    try {
      setIsLoading(true);

      // Construct event_date from dropdowns
      let eventDate = null;
      if (selectedDay && selectedMonth && selectedYear) {
        eventDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;
      } else {
        eventDate = null;
      }

      // Construct event_start_time from dropdowns
      let eventStartTime = null;
      if (selectedStartHour && selectedStartMinute) {
        eventStartTime = `${selectedStartHour}:${selectedStartMinute}`;
      }

      // Construct event_end_time from dropdowns
      let eventEndTime = null;
      if (selectedEndHour && selectedEndMinute) {
        eventEndTime = `${selectedEndHour}:${selectedEndMinute}`;
      }

      // Call API to update news
      const newsData = {
        title: formData.title?.trim() || "",
        content: formData.content?.trim() || "",
        category: formData.category,
        author: user?.name || "",
        event_date: eventDate,
        event_start_time: eventStartTime,
        event_end_time: eventEndTime,
      };

      const response = await updateNews(newsItem?.id || "", newsData);

      showToast(
        language === "EN"
          ? `News "${response.data.title}" has been updated successfully!`
          : `Berita "${response.data.title}" telah berhasil diperbarui!`,
        "success",
      );

      // Refresh manage news page and go back
      await refreshSpecific("manageNews");
      router.back();
    } catch (error: any) {
      console.error("Error updating news:", error);
      showToast(
        language === "EN"
          ? "Failed to update news. Please try again."
          : "Gagal memperbarui berita. Silakan coba lagi.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategorySelector = () => (
    <View className="mb-4">
      <Text
        className={`text-sm font-medium mb-2 ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {language === "EN" ? "Category *" : "Kategori *"}
      </Text>
      <View>
        <TouchableOpacity
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className={`p-3 rounded-lg border flex-row justify-between items-center ${
            isDarkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-gray-50 border-gray-300"
          }`}
        >
          <Text
            className={`${
              !formData.category
                ? isDarkMode
                  ? "text-gray-400"
                  : "text-gray-500"
                : isDarkMode
                  ? "text-white"
                  : "text-gray-800"
            }`}
          >
            {formData.category
              ? NEWS_CATEGORIES.find((c) => c.value === formData.category)
                  ?.label[language]
              : language === "EN"
                ? "Select Category"
                : "Pilih Kategori"}
          </Text>
          <Ionicons
            name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
        </TouchableOpacity>
        {showCategoryDropdown && (
          <View
            className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
              isDarkMode
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-gray-300"
            }`}
            style={{ maxHeight: 200 }}
          >
            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              onStartShouldSetResponder={() => true}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {NEWS_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      category: category.value as any,
                    });
                    setShowCategoryDropdown(false);
                  }}
                  className={`p-3 border-b ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  } ${formData.category === category.value ? "bg-blue-500" : ""}`}
                >
                  <Text
                    className={`text-center ${
                      formData.category === category.value
                        ? "text-white"
                        : isDarkMode
                          ? "text-white"
                          : "text-gray-800"
                    }`}
                  >
                    {category.label[language]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );

  if (loading || !newsItem) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"} items-center justify-center`}
        edges={["top", "left", "right", "bottom"]}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#EF4444" : "#EF4444"}
        />
        <Text className={`mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          {language === "EN" ? "Loading..." : "Memuat..."}
        </Text>
      </SafeAreaViewComponent>
    );
  }

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Header */}
        <Header
          title={language === "EN" ? "Edit News" : "Edit Berita"}
          subtitle={
            language === "EN"
              ? "Update and modify news information"
              : "Perbarui dan ubah informasi berita"
          }
          onBack={() => router.back()}
          isDarkMode={isDarkMode}
        />

        <KeyboardAwareScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 py-4">
            {/* Title Input */}
            <View className="mb-4">
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "News Title *" : "Judul Berita *"}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder={
                  language === "EN"
                    ? "Enter news title..."
                    : "Masukkan judul berita..."
                }
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
              />
            </View>

            {/* Category Selector */}
            {renderCategorySelector()}

            {/* Event Date Dropdown */}
            <View className="mb-4">
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN"
                  ? "Event Date (Optional)"
                  : "Tanggal Acara (Opsional)"}
              </Text>
              <View className="flex-row gap-2">
                {/* Day Dropdown */}
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setShowDayDropdown(!showDayDropdown);
                      setShowMonthDropdown(false);
                      setShowYearDropdown(false);
                    }}
                    className={`p-3 rounded-lg border flex-row justify-between items-center ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <Text
                      className={`${
                        !selectedDay
                          ? isDarkMode
                            ? "text-gray-400"
                            : "text-gray-500"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {selectedDay || "DD"}
                    </Text>
                    <Ionicons
                      name={showDayDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </TouchableOpacity>
                  {showDayDropdown && (
                    <View
                      className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600"
                          : "bg-white border-gray-300"
                      }`}
                      style={{ maxHeight: 150 }}
                    >
                      <ScrollView
                        style={{ maxHeight: 150 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        onStartShouldSetResponder={() => true}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {DAYS.map((d) => (
                          <TouchableOpacity
                            key={d.value}
                            onPress={() => {
                              setSelectedDay(d.value);
                              setShowDayDropdown(false);
                            }}
                            className={`p-3 border-b ${
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            } ${selectedDay === d.value ? "bg-blue-500" : ""}`}
                          >
                            <Text
                              className={`text-center ${
                                selectedDay === d.value
                                  ? "text-white"
                                  : isDarkMode
                                    ? "text-white"
                                    : "text-gray-800"
                              }`}
                            >
                              {d.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                {/* Month Dropdown */}
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setShowMonthDropdown(!showMonthDropdown);
                      setShowDayDropdown(false);
                      setShowYearDropdown(false);
                    }}
                    className={`p-3 rounded-lg border flex-row justify-between items-center ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <Text
                      className={`${
                        !selectedMonth
                          ? isDarkMode
                            ? "text-gray-400"
                            : "text-gray-500"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {selectedMonth
                        ? MONTHS.find((m) => m.value === selectedMonth)?.label[
                            language
                          ]
                        : "MM"}
                    </Text>
                    <Ionicons
                      name={showMonthDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </TouchableOpacity>
                  {showMonthDropdown && (
                    <View
                      className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600"
                          : "bg-white border-gray-300"
                      }`}
                      style={{ maxHeight: 150 }}
                    >
                      <ScrollView
                        style={{ maxHeight: 150 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        onStartShouldSetResponder={() => true}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {MONTHS.map((m) => (
                          <TouchableOpacity
                            key={m.value}
                            onPress={() => {
                              setSelectedMonth(m.value);
                              setShowMonthDropdown(false);
                            }}
                            className={`p-3 border-b ${
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            } ${selectedMonth === m.value ? "bg-blue-500" : ""}`}
                          >
                            <Text
                              className={`text-center ${
                                selectedMonth === m.value
                                  ? "text-white"
                                  : isDarkMode
                                    ? "text-white"
                                    : "text-gray-800"
                              }`}
                            >
                              {m.label[language]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                {/* Year Dropdown */}
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setShowYearDropdown(!showYearDropdown);
                      setShowDayDropdown(false);
                      setShowMonthDropdown(false);
                    }}
                    className={`p-3 rounded-lg border flex-row justify-between items-center ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <Text
                      className={`${
                        !selectedYear
                          ? isDarkMode
                            ? "text-gray-400"
                            : "text-gray-500"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {selectedYear || "YYYY"}
                    </Text>
                    <Ionicons
                      name={showYearDropdown ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </TouchableOpacity>
                  {showYearDropdown && (
                    <View
                      className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600"
                          : "bg-white border-gray-300"
                      }`}
                      style={{ maxHeight: 150 }}
                    >
                      <ScrollView
                        style={{ maxHeight: 150 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        onStartShouldSetResponder={() => true}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {years.map((y) => (
                          <TouchableOpacity
                            key={y.value}
                            onPress={() => {
                              setSelectedYear(y.value);
                              setShowYearDropdown(false);
                            }}
                            className={`p-3 border-b ${
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            } ${selectedYear === y.value ? "bg-blue-500" : ""}`}
                          >
                            <Text
                              className={`text-center ${
                                selectedYear === y.value
                                  ? "text-white"
                                  : isDarkMode
                                    ? "text-white"
                                    : "text-gray-800"
                              }`}
                            >
                              {y.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Event Time Dropdown */}
            <View className="mb-4">
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN"
                  ? "Event Time (Optional)"
                  : "Waktu Acara (Opsional)"}
              </Text>
              <View className="flex-row gap-2">
                {/* Start Time */}
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {language === "EN" ? "Start" : "Mulai"}
                  </Text>
                  <View className="flex-row gap-1">
                    {/* Start Hour */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowStartHourDropdown(!showStartHourDropdown);
                          setShowStartMinuteDropdown(false);
                          setShowEndHourDropdown(false);
                          setShowEndMinuteDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !selectedStartHour
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {selectedStartHour || "HH"}
                        </Text>
                        <Ionicons
                          name={
                            showStartHourDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showStartHourDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 150 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 150 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {HOURS.map((h) => (
                              <TouchableOpacity
                                key={h.value}
                                onPress={() => {
                                  setSelectedStartHour(h.value);
                                  setShowStartHourDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${selectedStartHour === h.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    selectedStartHour === h.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {h.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    {/* Start Minute */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowStartMinuteDropdown(!showStartMinuteDropdown);
                          setShowStartHourDropdown(false);
                          setShowEndHourDropdown(false);
                          setShowEndMinuteDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !selectedStartMinute
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {selectedStartMinute || "MM"}
                        </Text>
                        <Ionicons
                          name={
                            showStartMinuteDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showStartMinuteDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 150 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 150 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {MINUTES.map((m) => (
                              <TouchableOpacity
                                key={m.value}
                                onPress={() => {
                                  setSelectedStartMinute(m.value);
                                  setShowStartMinuteDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${selectedStartMinute === m.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    selectedStartMinute === m.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {/* End Time */}
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {language === "EN" ? "End" : "Selesai"}
                  </Text>
                  <View className="flex-row gap-1">
                    {/* End Hour */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowEndHourDropdown(!showEndHourDropdown);
                          setShowStartHourDropdown(false);
                          setShowStartMinuteDropdown(false);
                          setShowEndMinuteDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !selectedEndHour
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {selectedEndHour || "HH"}
                        </Text>
                        <Ionicons
                          name={
                            showEndHourDropdown ? "chevron-up" : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showEndHourDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 150 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 150 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {HOURS.map((h) => (
                              <TouchableOpacity
                                key={h.value}
                                onPress={() => {
                                  setSelectedEndHour(h.value);
                                  setShowEndHourDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${selectedEndHour === h.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    selectedEndHour === h.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {h.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    {/* End Minute */}
                    <View className="flex-1">
                      <TouchableOpacity
                        onPress={() => {
                          setShowEndMinuteDropdown(!showEndMinuteDropdown);
                          setShowStartHourDropdown(false);
                          setShowStartMinuteDropdown(false);
                          setShowEndHourDropdown(false);
                        }}
                        className={`p-3 rounded-lg border flex-row justify-between items-center ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-600"
                            : "bg-gray-50 border-gray-300"
                        }`}
                      >
                        <Text
                          className={`${
                            !selectedEndMinute
                              ? isDarkMode
                                ? "text-gray-400"
                                : "text-gray-500"
                              : isDarkMode
                                ? "text-white"
                                : "text-gray-800"
                          }`}
                        >
                          {selectedEndMinute || "MM"}
                        </Text>
                        <Ionicons
                          name={
                            showEndMinuteDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={16}
                          color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                      </TouchableOpacity>
                      {showEndMinuteDropdown && (
                        <View
                          className={`absolute top-14 left-0 right-0 z-50 rounded-lg border shadow-lg ${
                            isDarkMode
                              ? "bg-gray-800 border-gray-600"
                              : "bg-white border-gray-300"
                          }`}
                          style={{ maxHeight: 150 }}
                        >
                          <ScrollView
                            style={{ maxHeight: 150 }}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            onStartShouldSetResponder={() => true}
                            onTouchStart={(e) => e.stopPropagation()}
                          >
                            {MINUTES.map((m) => (
                              <TouchableOpacity
                                key={m.value}
                                onPress={() => {
                                  setSelectedEndMinute(m.value);
                                  setShowEndMinuteDropdown(false);
                                }}
                                className={`p-3 border-b ${
                                  isDarkMode
                                    ? "border-gray-700"
                                    : "border-gray-200"
                                } ${selectedEndMinute === m.value ? "bg-blue-500" : ""}`}
                              >
                                <Text
                                  className={`text-center ${
                                    selectedEndMinute === m.value
                                      ? "text-white"
                                      : isDarkMode
                                        ? "text-white"
                                        : "text-gray-800"
                                  }`}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Content Input */}
            <View className="mb-4">
              <Text
                className={`text-sm font-medium mb-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {language === "EN" ? "Content *" : "Konten *"}
              </Text>
              <TextInput
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder={
                  language === "EN"
                    ? "Enter news content..."
                    : "Masukkan konten berita..."
                }
                placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                value={formData.content}
                onChangeText={(text) =>
                  setFormData({ ...formData, content: text })
                }
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              className={`w-full p-4 rounded-xl flex-row items-center justify-center ${
                isLoading
                  ? "bg-gray-400"
                  : isDarkMode
                    ? "bg-red-600"
                    : "bg-red-500"
              } shadow-md`}
              onPress={handleUpdateNews}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <Text className="text-white font-semibold">
                    {language === "EN" ? "Updating..." : "Memperbarui..."}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    {language === "EN" ? "Update News" : "Perbarui Berita"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
