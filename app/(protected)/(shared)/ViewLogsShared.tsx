import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useTimezone } from "@/hooks/useTimezone";
import { getAttendanceLogs } from "@/services/api";
import { AttendanceLog } from "@/types/logs";
import { formatDate, formatTime } from "@/utils/dateUtils";
import { v4 as uuidv4 } from "uuid";
import {
  getAttendanceStatusColor,
  getAttendanceStatusText,
  getAttendanceStatusTextColor,
} from "@/utils/statusUtils";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface ViewLogsTabProps {
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onBack?: () => void;
  titleEN?: string;
  titleID?: string;
  subtitleEN?: string;
  subtitleID?: string;
  user?: any; // User object to filter logs by username
  filterByUser?: boolean; // Whether to filter logs by current user
  searchPlaceholderEN?: string;
  searchPlaceholderID?: string;
  searchFields?: ("name" | "username" | "jurusan" | "location" | "status")[];
}

export default function ViewLogsShared({
  isDarkMode,
  language,
  showToast,
  onBack,
  titleEN = "View Attendance Logs",
  titleID = "Lihat Log Absensi",
  subtitleEN = "See all attendance logs with search",
  subtitleID = "Lihat semua log absensi dengan pencarian",
  user,
  filterByUser = false,
  searchPlaceholderEN = "Search by name, username, or location...",
  searchPlaceholderID = "Cari berdasarkan nama, username, atau lokasi...",
  searchFields = ["name", "username", "jurusan", "location", "status"],
}: ViewLogsTabProps) {
  const { timezoneInfo } = useTimezone();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<AttendanceLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Helper function to convert timezone to abbreviation
  const getTimezoneAbbreviation = (tz: string): string => {
    const tzLower = tz.toLowerCase();
    if (tzLower === "wib" || tzLower === "asia/jakarta") return "WIB";
    if (tzLower === "wita" || tzLower === "asia/makassar") return "WITA";
    if (tzLower === "wit" || tzLower === "asia/jayapura") return "WIT";
    return "WIB"; // Default to WIB
  };

  useEffect(() => {
    // Only load if filterByUser is false OR user.username is available
    if (!filterByUser || user?.username) {
      setCurrentPage(1);
      loadLogs(1, false);
    }
  }, [user?.username, filterByUser]); // Load logs when user or filter changes

  // Search/filter logs when search query changes
  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => {
        const checks = [];
        if (searchFields.includes("name"))
          checks.push(log.name?.toLowerCase().includes(query));
        if (searchFields.includes("username"))
          checks.push(log.username?.toLowerCase().includes(query));
        if (searchFields.includes("jurusan"))
          checks.push(log.jurusan?.toLowerCase().includes(query));
        if (searchFields.includes("location"))
          checks.push(log.location?.toLowerCase().includes(query));
        if (searchFields.includes("status"))
          checks.push(log.status?.toLowerCase().includes(query));
        return checks.some((check) => check);
      });
    }

    setFilteredLogs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, logs, searchFields]);

  const loadLogs = async (page: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      // Load attendance logs with optional username filter
      const response = await getAttendanceLogs({
        page: page,
        limit: 10,
        user_id: filterByUser && user?.username ? user.username : undefined,
      });
      const logsData = response.data || [];

      if (isLoadMore) {
        // Filter out duplicates based on id before appending
        setLogs((prev) => {
          const existingIds = new Set(prev.map((log) => log.id));
          const newLogs = logsData.filter((log) => !existingIds.has(log.id));
          return [...prev, ...newLogs];
        });
        setFilteredLogs((prev) => {
          const existingIds = new Set(prev.map((log) => log.id));
          const newLogs = logsData.filter((log) => !existingIds.has(log.id));
          return [...prev, ...newLogs];
        });
      } else {
        setLogs(logsData);
        setFilteredLogs(logsData);
      }

      // Check if there are more items to load
      setHasMore(logsData.length === 10);
    } catch (error: any) {
      console.error("Error loading logs:", error);
      // Check for network error
      if (
        error.code === "NETWORK_ERROR" ||
        error.code === "ECONNABORTED" ||
        !error.response
      ) {
        showToast(
          language === "EN"
            ? "Network error. Please check your internet connection."
            : "Error jaringan. Silakan periksa koneksi internet Anda.",
          "error",
        );
      } else {
        showToast(
          language === "EN"
            ? "Failed to load attendance logs"
            : "Gagal memuat log absensi",
          "error",
        );
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadLogs(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadLogs(nextPage, true);
    }
  };

  const renderLogItem = ({ item }: { item: AttendanceLog }) => (
    <View
      className={`p-4 rounded-xl mb-3 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-sm border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text
            className={`font-semibold text-lg ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {item.name}
          </Text>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {item.username} • {item.jurusan || "-"}
          </Text>
        </View>
        <View
          className={`px-3 py-1 rounded-full ${getAttendanceStatusColor(item.status, isDarkMode)}`}
        >
          <Text
            className={`text-xs font-medium ${getAttendanceStatusTextColor(item.status)}`}
          >
            {getAttendanceStatusText(item.status, language)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Ionicons
            name="calendar-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Date" : "Tanggal"}:{" "}
            {formatDate(
              item.check_time || item.checkTime || item.created_at || item.date,
              timezoneInfo.timezone,
            )}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Time" : "Waktu"}:{" "}
            {formatTime(
              item.check_time || item.checkTime || item.created_at || "-",
              timezoneInfo.timezone,
            )}{" "}
            {getTimezoneAbbreviation(timezoneInfo.timezone)}
          </Text>
        </View>
      </View>

      {item.device_uid && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="card-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            UID: {item.device_uid}
          </Text>
        </View>
      )}

      {item.device_name && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="hardware-chip-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Device" : "Perangkat"}: {item.device_name}
          </Text>
        </View>
      )}

      {item.location && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="location-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {item.location}
          </Text>
        </View>
      )}

      {item.response_time && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="flash-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Response Time" : "Waktu Respon"}:{" "}
            {item.response_time}
          </Text>
        </View>
      )}

      {!item.response_time && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="flash-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            className="mr-2"
          />
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Response Time" : "Waktu Respon"}: -
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        {/* Header */}
        <Header
          title={language === "EN" ? titleEN : titleID}
          subtitle={language === "EN" ? subtitleEN : subtitleID}
          onBack={onBack}
          isDarkMode={isDarkMode}
        />

        {/* Search Bar */}
        <View className="px-6 py-4">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN={searchPlaceholderEN}
            placeholderID={searchPlaceholderID}
            isDarkMode={isDarkMode}
            language={language}
            containerStyle={{
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
              borderWidth: 1,
              borderColor: isDarkMode ? "#374151" : "#E5E7EB",
            }}
          />
        </View>

        {/* Loading State */}
        {loading && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#EF4444" />
            <Text
              className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {language === "EN" ? "Loading..." : "Memuat..."}
            </Text>
          </View>
        )}

        {/* Logs List */}
        {!loading && (
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id?.toString()}
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#EF4444"
                colors={["#EF4444"]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={() => (
              <EmptyState
                icon="document-text-outline"
                iconSize={64}
                titleEN={
                  searchQuery.trim()
                    ? `No results found for "${searchQuery}"`
                    : "No attendance logs found"
                }
                titleID={
                  searchQuery.trim()
                    ? `Tidak ada hasil untuk "${searchQuery}"`
                    : "Tidak ada log absensi"
                }
                subtitleEN={
                  searchQuery.trim()
                    ? "Try adjusting your search terms"
                    : "No attendance records are available yet"
                }
                subtitleID={
                  searchQuery.trim()
                    ? "Coba ubah kata pencarian Anda"
                    : "Belum ada catatan kehadiran yang tersedia"
                }
                isDarkMode={isDarkMode}
                language={language}
                containerStyle={{ paddingVertical: 80 }}
              />
            )}
            ListFooterComponent={() =>
              loadingMore ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#EF4444" />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaViewComponent>
  );
}
