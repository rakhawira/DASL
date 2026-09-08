import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import { useTimezone } from "@/hooks/useTimezone";
import { getNews } from "@/services/api";
import { News } from "@/types/news";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar/legacy";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface CalendarSharedProps {
  user?: any;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
  isVisible?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  notes?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  allDay: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarShared({
  isDarkMode,
  language,
  showToast,
  isVisible = false,
  onClose,
  isModal = false,
}: CalendarSharedProps) {
  const { timezoneInfo } = useTimezone();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadNews();
  }, [currentMonth]);

  const loadNews = async () => {
    try {
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      );

      const response = await getNews({ page: 1, limit: 100 });
      const allNews = response.data || [];

      // Filter news that have event_date in the current month
      const filteredNews = allNews.filter((item: News) => {
        if (!item.event_date) return false;
        const eventDate = new Date(item.event_date);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });

      setNews(filteredNews);
    } catch (error) {
      console.error("Error loading news:", error);
    }
  };

  const requestCalendarPermissions = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      setHasPermission(true);
      fetchCalendarEvents();
    } else {
      showToast(
        language === "EN"
          ? "Calendar permission denied"
          : "Izin kalender ditolak",
        "error",
      );
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );

      if (calendars.length === 0) {
        return;
      }

      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      );

      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        const calendarEvents = await Calendar.getEventsAsync(
          [calendar.id],
          startOfMonth,
          endOfMonth,
        );

        const mappedEvents = calendarEvents.map((event) => ({
          id: event.id,
          title: event.title,
          notes: event.notes,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          location: event.location,
          allDay: event.allDay,
        }));

        allEvents.push(...mappedEvents);
      }

      setEvents(
        allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
      );
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      showToast(
        language === "EN"
          ? "Failed to fetch calendar events"
          : "Gagal mengambil acara kalender",
        "error",
      );
    }
  };

  const checkAndRequestPermission = async () => {
    setPermissionLoading(true);
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        fetchCalendarEvents();
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error("Error checking permission:", error);
      setHasPermission(false);
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    if (isModal ? isVisible : true) {
      checkAndRequestPermission();
    }
  }, [isModal ? isVisible : true, currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDate(event.startDate, date));
  };

  const getNewsForDate = (date: Date) => {
    return news.filter((item) => {
      if (!item.event_date) return false;
      const eventDate = new Date(item.event_date);
      return isSameDate(eventDate, date);
    });
  };

  const getNewsColor = (category: string) => {
    switch (category) {
      case "event":
        return "bg-green-500";
      case "herregistrasi_perwalian":
        return "bg-blue-500";
      case "perubahan_krs":
        return "bg-cyan-500";
      case "pembatalan_krs":
        return "bg-red-500";
      case "data_krs_tetap":
        return "bg-indigo-500";
      case "batas_pengajuan_cuti":
        return "bg-yellow-500";
      case "pelaksanaan_praktikum":
        return "bg-green-500";
      case "pengumuman_nilai":
        return "bg-purple-500";
      case "pengumuman_presensi":
        return "bg-pink-500";
      case "ujian_praktikum":
        return "bg-orange-500";
      case "uts_uas":
        return "bg-red-600";
      case "pengumuman_yudisium":
        return "bg-teal-500";
      case "hari_tenang":
        return "bg-gray-500";
      case "hari_libur_semester":
        return "bg-emerald-500";
      case "hari_libur_nasional":
        return "bg-rose-500";
      case "daftar_sidang_ta_akhir":
        return "bg-violet-500";
      case "dies_natalis":
        return "bg-amber-500";
      case "wisuda":
        return "bg-fuchsia-500";
      case "hari_upacara":
        return "bg-lime-500";
      case "kelengkapan_yudisium_akhir":
        return "bg-sky-500";
      default:
        return "bg-gray-500";
    }
  };

  const renderMonthView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: (Date | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const dayNames = language === "EN" ? DAYS : DAYS_ID;
    const monthNames =
      language === "EN"
        ? [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ]
        : [
            "Januari",
            "Februari",
            "Maret",
            "April",
            "Mei",
            "Juni",
            "Juli",
            "Agustus",
            "September",
            "Oktober",
            "November",
            "Desember",
          ];

    return (
      <View className="flex-1">
        <View className="flex-row justify-between items-center px-6 py-4">
          <TouchableOpacity
            onPress={handlePrevMonth}
            className={`p-2 rounded-3xl ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDarkMode ? "#fff" : "#374151"}
            />
          </TouchableOpacity>
          <Text
            className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            className={`p-2 rounded-3xl ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isDarkMode ? "#fff" : "#374151"}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row px-4 mb-2">
          {dayNames.map((day, index) => (
            <View
              key={index}
              className="flex-1 h-10 items-center justify-center"
            >
              <Text
                className={`text-xs font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap px-4">
          {days.map((date, index) => {
            if (!date) {
              return <View key={index} className="w-[14.28%] h-14 p-1" />;
            }

            const isSelected = isSameDate(date, selectedDate);
            const isToday = isSameDate(date, new Date());
            const dayEvents = getEventsForDate(date);
            const hasDeviceEvents = dayEvents.length > 0;
            const dayNews = getNewsForDate(date);
            const hasNews = dayNews.length > 0;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleDateSelect(date)}
                className={`w-[14.28%] h-14 p-1 rounded-lg items-center justify-center ${
                  isSelected
                    ? "bg-blue-500"
                    : isToday
                      ? isDarkMode
                        ? "bg-gray-700 border border-blue-400"
                        : "bg-blue-50 border border-blue-300"
                      : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    isSelected
                      ? "text-white font-bold"
                      : isDarkMode
                        ? "text-gray-300"
                        : "text-gray-800"
                  }`}
                >
                  {date.getDate()}
                </Text>
                <View className="flex-row mt-0.5">
                  {hasNews && (
                    <View
                      className={`w-1.5 h-1.5 rounded-full mx-0.5 ${getNewsColor(
                        dayNews[0].category,
                      )}`}
                    />
                  )}
                  {hasDeviceEvents && (
                    <View
                      className={`w-1.5 h-1.5 rounded-full mx-0.5 ${
                        isSelected ? "bg-white" : "bg-blue-500"
                      }`}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-1 px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}
            >
              {language === "EN" ? "Events" : "Acara"}
            </Text>
            <Text
              className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              {selectedDate.toLocaleDateString(
                language === "EN" ? "en-US" : "id-ID",
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: timezoneInfo.timezone.includes("/")
                    ? timezoneInfo.timezone
                    : timezoneInfo.timezone === "WIB"
                      ? "Asia/Jakarta"
                      : timezoneInfo.timezone === "WITA"
                        ? "Asia/Makassar"
                        : timezoneInfo.timezone === "WIT"
                          ? "Asia/Jayapura"
                          : timezoneInfo.timezone,
                },
              )}
            </Text>
          </View>

          <ScrollView className="flex-1">
            {(() => {
              const deviceEvents = getEventsForDate(selectedDate);
              const dayNews = getNewsForDate(selectedDate);
              const totalEvents = deviceEvents.length + dayNews.length;

              if (totalEvents === 0) {
                return (
                  <EmptyState
                    icon="calendar-outline"
                    titleEN="No events for this date"
                    titleID="Tidak ada acara untuk tanggal ini"
                    subtitleEN="No scheduled events"
                    subtitleID="Tidak ada acara yang dijadwalkan"
                    isDarkMode={isDarkMode}
                    language={language}
                  />
                );
              }

              return (
                <>
                  {dayNews.map((newsItem) => (
                    <View
                      key={`news-${newsItem.id}`}
                      className={`p-4 rounded-xl mb-3 border-l-4 ${getNewsColor(
                        newsItem.category,
                      ).replace("bg-", "border-")} ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      } shadow-sm`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text
                            className={`font-bold text-base ${
                              isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {newsItem.title}
                          </Text>
                          <Text
                            className={`text-xs mt-1 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {newsItem.category.charAt(0).toUpperCase() +
                              newsItem.category.slice(1)}
                          </Text>
                          {newsItem.event_start_time &&
                            newsItem.event_end_time && (
                              <Text
                                className={`text-xs mt-2 ${
                                  isDarkMode ? "text-gray-500" : "text-gray-400"
                                }`}
                              >
                                {newsItem.event_start_time} -{" "}
                                {newsItem.event_end_time}
                              </Text>
                            )}
                        </View>
                        <View
                          className={`w-2 h-2 rounded-full ${getNewsColor(
                            newsItem.category,
                          )}`}
                        />
                      </View>
                    </View>
                  ))}

                  {deviceEvents.map((event) => (
                    <View
                      key={event.id}
                      className={`p-4 rounded-xl mb-3 ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      } shadow-sm`}
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text
                            className={`font-bold text-base ${
                              isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {event.title}
                          </Text>
                          {event.notes && (
                            <Text
                              className={`text-sm mt-1 ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {event.notes}
                            </Text>
                          )}
                          {event.location && (
                            <View className="flex-row items-center mt-2">
                              <Ionicons
                                name="location-outline"
                                size={14}
                                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                              />
                              <Text
                                className={`text-xs ml-1 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                {event.location}
                              </Text>
                            </View>
                          )}
                          <Text
                            className={`text-xs mt-2 ${
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            {event.allDay
                              ? language === "EN"
                                ? "All day"
                                : "Sepanjang hari"
                              : `${event.startDate.toLocaleTimeString(
                                  language === "EN" ? "en-US" : "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: timezoneInfo.timezone.includes(
                                      "/",
                                    )
                                      ? timezoneInfo.timezone
                                      : timezoneInfo.timezone === "WIB"
                                        ? "Asia/Jakarta"
                                        : timezoneInfo.timezone === "WITA"
                                          ? "Asia/Makassar"
                                          : timezoneInfo.timezone === "WIT"
                                            ? "Asia/Jayapura"
                                            : timezoneInfo.timezone,
                                  },
                                )} - ${event.endDate.toLocaleTimeString(
                                  language === "EN" ? "en-US" : "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: timezoneInfo.timezone.includes(
                                      "/",
                                    )
                                      ? timezoneInfo.timezone
                                      : timezoneInfo.timezone === "WIB"
                                        ? "Asia/Jakarta"
                                        : timezoneInfo.timezone === "WITA"
                                          ? "Asia/Makassar"
                                          : timezoneInfo.timezone === "WIT"
                                            ? "Asia/Jayapura"
                                            : timezoneInfo.timezone,
                                  },
                                )}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              );
            })()}
          </ScrollView>
        </View>
      </View>
    );
  };

  // Show loading while checking permission
  if (permissionLoading) {
    return (
      <SafeAreaViewComponent
        className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        edges={["top", "left", "right", "bottom"]}
      >
        <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
          <Header
            title={language === "EN" ? "Calendar" : "Kalender"}
            isDarkMode={isDarkMode}
            onBack={onClose || (() => {})}
          />
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#EF4444" />
            <Text
              className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {language === "EN" ? "Loading..." : "Memuat..."}
            </Text>
          </View>
        </View>
      </SafeAreaViewComponent>
    );
  }

  if (!hasPermission) {
    if (isModal) {
      return (
        <Modal
          visible={isVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaViewComponent
            className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
            edges={["top", "left", "right", "bottom"]}
          >
            <View
              className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
            >
              <Header
                title={language === "EN" ? "Calendar" : "Kalender"}
                isDarkMode={isDarkMode}
                onBack={onClose || (() => {})}
              />
              <View className="flex-1 justify-center items-center px-6">
                <MaterialCommunityIcons
                  name="calendar-lock"
                  size={64}
                  color={isDarkMode ? "#4B5563" : "#9CA3AF"}
                />
                <Text
                  className={`text-lg font-bold mt-4 mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  {language === "EN"
                    ? "Permission Required"
                    : "Izin Diperlukan"}
                </Text>
                <Text
                  className={`text-center mb-6 ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {language === "EN"
                    ? "Calendar access is required to view and manage your events."
                    : "Akses kalender diperlukan untuk melihat dan mengelola acara Anda."}
                </Text>
                <TouchableOpacity
                  onPress={requestCalendarPermissions}
                  className="py-4 px-8 rounded-2xl items-center justify-center bg-red-500"
                >
                  <Text className="font-bold text-white">
                    {language === "EN" ? "Grant Permission" : "Berikan Izin"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaViewComponent>
        </Modal>
      );
    } else {
      return (
        <SafeAreaViewComponent
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          edges={["top", "left", "right", "bottom"]}
        >
          <View
            className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          >
            <Header
              title={language === "EN" ? "Calendar" : "Kalender"}
              isDarkMode={isDarkMode}
              onBack={onClose || (() => {})}
            />
            <View className="flex-1 justify-center items-center px-6">
              <MaterialCommunityIcons
                name="calendar-lock"
                size={64}
                color={isDarkMode ? "#4B5563" : "#9CA3AF"}
              />
              <Text
                className={`text-lg font-bold mt-4 mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {language === "EN" ? "Permission Required" : "Izin Diperlukan"}
              </Text>
              <Text
                className={`text-center mb-6 ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "EN"
                  ? "Calendar access is required to view and manage your events."
                  : "Akses kalender diperlukan untuk melihat dan mengelola acara Anda."}
              </Text>
              <TouchableOpacity
                onPress={requestCalendarPermissions}
                className="py-4 px-8 rounded-2xl items-center justify-center bg-red-500"
              >
                <Text className="font-bold text-white">
                  {language === "EN" ? "Grant Permission" : "Berikan Izin"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaViewComponent>
      );
    }
  }

  const renderContent = () => (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header
        title={language === "EN" ? "Calendar" : "Kalender"}
        isDarkMode={isDarkMode}
        onBack={isModal ? onClose || (() => {}) : onClose || (() => {})}
      />
      {renderMonthView()}
    </View>
  );

  if (isModal) {
    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaViewComponent
          className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
          edges={["top", "left", "right", "bottom"]}
        >
          {renderContent()}
        </SafeAreaViewComponent>
      </Modal>
    );
  }

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      {renderContent()}
    </SafeAreaViewComponent>
  );
}
