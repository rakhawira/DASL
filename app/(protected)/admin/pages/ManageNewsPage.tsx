import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { NEWS_CATEGORIES_WITH_ALL } from "@/constants/newsConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useTimezone } from "@/hooks/useTimezone";
import { deleteNews, getAdminNews, updateNews } from "@/services/api";
import { News } from "@/types/news";
import { formatDate } from "@/utils/dateUtils";
import { getActiveStatusColor } from "@/utils/statusUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function ManageNewsTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { timezoneInfo } = useTimezone();
  const [news, setNews] = useState<News[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [togglingNews, setTogglingNews] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<News | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const {
    registerRefreshFunction,
    unregisterRefreshFunction,
    getRefreshControl,
  } = useRefresh();

  const categories = NEWS_CATEGORIES_WITH_ALL;

  const loadNews = async (page: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const params: any = {
        page: page,
        limit: 10,
      };

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await getAdminNews(params);
      const newsData = response.data || [];

      if (isLoadMore) {
        setNews((prev) => [...prev, ...newsData]);
      } else {
        setNews(newsData);
      }

      // Check if there are more items to load
      setHasMore(newsData.length === 10);
    } catch (error: any) {
      console.error("Error loading news:", error);
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
          language === "EN" ? "Failed to load news" : "Gagal memuat berita",
          "error",
        );
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Load news from API
    setCurrentPage(1);
    loadNews(1, false);
  }, [selectedCategory, searchQuery, showToast, language]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await loadNews(1, false);
    setRefreshing(false);
  }, [selectedCategory, searchQuery, showToast, language]);

  // Register refresh function
  useEffect(() => {
    registerRefreshFunction("manageNews", onRefresh);
    return () => {
      unregisterRefreshFunction("manageNews");
    };
  }, [registerRefreshFunction, unregisterRefreshFunction]);

  const handleFloatingAddNews = () => {
    router.push("/admin/pages/AddNewsPage");
  };

  const handleEditNews = (newsItem: News) => {
    router.push({
      pathname: "/admin/pages/EditNewsPage",
      params: { newsId: newsItem.id.toString() },
    });
  };

  const handleNewsUpdated = () => {
    // Refresh news list after update
    const loadNews = async () => {
      try {
        setIsLoading(true);
        const params: any = {
          page: 1,
          limit: 50,
        };

        if (selectedCategory) {
          params.category = selectedCategory;
        }

        if (searchQuery) {
          params.search = searchQuery;
        }

        const response = await getAdminNews(params);
        setNews(response.data || []);
      } catch (error) {
        console.error("Error loading news:", error);
        showToast(
          language === "EN" ? "Failed to load news" : "Gagal memuat berita",
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  };

  const handleNewsAdded = () => {
    onRefresh();
  };

  const handleNewsUpdatedWrapper = () => {
    handleNewsUpdated();
  };

  const handleDeleteNews = (newsItem: News) => {
    setNewsToDelete(newsItem);
    setShowDeleteModal(true);
  };

  const confirmDeleteNews = async () => {
    if (!newsToDelete) return;

    setIsDeleting(true);
    try {
      await deleteNews(newsToDelete.id);
      setNews((prev) => prev.filter((item) => item.id !== newsToDelete.id));
      showToast(
        language === "EN"
          ? "News deleted successfully"
          : "Berita berhasil dihapus",
        "success",
      );
      setShowDeleteModal(false);
      setNewsToDelete(null);
    } catch (error) {
      console.error("Error deleting news:", error);
      showToast(
        language === "EN" ? "Failed to delete news" : "Gagal menghapus berita",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteNews = () => {
    setShowDeleteModal(false);
    setNewsToDelete(null);
  };

  const handleToggleStatus = async (newsId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      // Set loading state
      setTogglingNews(newsId);

      // Update UI immediately for better UX
      setNews((prev) =>
        prev.map((item) =>
          item.id === newsId ? { ...item, is_active: newStatus } : item,
        ),
      );

      // Update database
      const response = await updateNews(newsId, { is_active: newStatus });

      showToast(
        language === "EN"
          ? `News ${newStatus ? "activated" : "deactivated"} successfully`
          : `Berita ${newStatus ? "diaktifkan" : "dinonaktifkan"} berhasil`,
        "success",
      );
    } catch (error) {
      // Revert UI change if database update fails
      setNews((prev) =>
        prev.map((item) =>
          item.id === newsId ? { ...item, is_active: currentStatus } : item,
        ),
      );

      showToast(
        language === "EN"
          ? "Failed to update news status"
          : "Gagal memperbarui status berita",
        "error",
      );
    } finally {
      // Clear loading state
      setTogglingNews(null);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadNews(nextPage, true);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "event":
        return isDarkMode ? "bg-green-900" : "bg-green-100";
      case "herregistrasi_perwalian":
        return isDarkMode ? "bg-blue-900" : "bg-blue-100";
      case "perubahan_krs":
        return isDarkMode ? "bg-cyan-900" : "bg-cyan-100";
      case "pembatalan_krs":
        return isDarkMode ? "bg-red-900" : "bg-red-100";
      case "data_krs_tetap":
        return isDarkMode ? "bg-indigo-900" : "bg-indigo-100";
      case "batas_pengajuan_cuti":
        return isDarkMode ? "bg-yellow-900" : "bg-yellow-100";
      case "pelaksanaan_praktikum":
        return isDarkMode ? "bg-green-900" : "bg-green-100";
      case "pengumuman_nilai":
        return isDarkMode ? "bg-purple-900" : "bg-purple-100";
      case "pengumuman_presensi":
        return isDarkMode ? "bg-pink-900" : "bg-pink-100";
      case "ujian_praktikum":
        return isDarkMode ? "bg-orange-900" : "bg-orange-100";
      case "uts_uas":
        return isDarkMode ? "bg-red-950" : "bg-red-200";
      case "pengumuman_yudisium":
        return isDarkMode ? "bg-teal-900" : "bg-teal-100";
      case "hari_tenang":
        return isDarkMode ? "bg-gray-800" : "bg-gray-200";
      case "hari_libur_semester":
        return isDarkMode ? "bg-emerald-900" : "bg-emerald-100";
      case "hari_libur_nasional":
        return isDarkMode ? "bg-rose-900" : "bg-rose-100";
      case "daftar_sidang_ta_akhir":
        return isDarkMode ? "bg-violet-900" : "bg-violet-100";
      case "dies_natalis":
        return isDarkMode ? "bg-amber-900" : "bg-amber-100";
      case "wisuda":
        return isDarkMode ? "bg-fuchsia-900" : "bg-fuchsia-100";
      case "hari_upacara":
        return isDarkMode ? "bg-lime-900" : "bg-lime-100";
      case "kelengkapan_yudisium_akhir":
        return isDarkMode ? "bg-sky-900" : "bg-sky-100";
      default:
        return isDarkMode ? "bg-gray-800" : "bg-gray-200";
    }
  };

  const formatNewsDate = (dateString: string) => {
    return formatDate(dateString, timezoneInfo.timezone);
  };

  const NewsCard = ({ item }: { item: News }) => (
    <View
      className={`mb-3 p-4 rounded-xl ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3 gap-2">
        <View className="flex-1">
          <View className="flex-row gap-2 mb-2">
            <View
              className={`px-2 py-1 rounded-lg ${getCategoryColor(item.category)}`}
            >
              <Text className="text-xs font-semibold text-white">
                {categories
                  .find((c) => c.value === item.category)
                  ?.label[language]?.slice(0, 3)
                  .toUpperCase() || item.category.slice(0, 3).toUpperCase()}
              </Text>
            </View>
            <View
              className={`px-2 py-1 rounded-lg ${getActiveStatusColor(item.is_active, isDarkMode)}`}
            >
              <Text className="text-xs font-semibold text-white">
                {item.is_active
                  ? language === "EN"
                    ? "ACTIVE"
                    : "AKTIF"
                  : language === "EN"
                    ? "INACTIVE"
                    : "TIDAK AKTIF"}
              </Text>
            </View>
          </View>
          <Text
            className={`font-semibold ${
              isDarkMode ? "text-white" : "text-gray-800"
            } ${!item.is_active ? "opacity-60" : ""}`}
          >
            {item.title}
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleToggleStatus(item.id, item.is_active)}
            className={`px-2 py-1 rounded ${
              item.is_active ? "bg-green-500" : "bg-gray-400"
            } ${togglingNews === item.id ? "opacity-50" : ""}`}
            activeOpacity={0.7}
            disabled={togglingNews === item.id}
          >
            {togglingNews === item.id ? (
              <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Ionicons
                name={item.is_active ? "eye" : "eye-off"}
                size={16}
                color="white"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Info */}
      <View className="space-y-2 mb-4">
        <View className="flex-row items-center">
          <Ionicons
            name="person-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {item.author}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Created: " : "Dibuat: "}
            {formatNewsDate(item.created_at)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name="refresh-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Updated: " : "Diperbarui: "}
            {formatNewsDate(item.updated_at)}
          </Text>
        </View>
        {item.event_date && (
          <View className="flex-row items-center">
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {language === "EN" ? "Event: " : "Acara: "}
              {formatNewsDate(item.event_date)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center">
          <Ionicons
            name="time-outline"
            size={16}
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`ml-2 text-sm ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {language === "EN" ? "Time: " : "Waktu: "}
            {item.event_start_time || "-"}
            {item.event_start_time && item.event_end_time ? " - " : ""}
            {item.event_end_time || "-"}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 bg-blue-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => handleEditNews(item)}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text className="ml-1 text-white text-sm font-medium">
            {language === "EN" ? "Edit" : "Ubah"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => handleDeleteNews(item)}
        >
          <Ionicons name="trash-outline" size={16} color="white" />
          <Text className="ml-1 text-white text-sm font-medium">
            {language === "EN" ? "Delete" : "Hapus"}
          </Text>
        </TouchableOpacity>
      </View>
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
          title={language === "EN" ? "Manage News" : "Kelola Berita"}
          subtitle={
            language === "EN"
              ? "View, edit, and manage all campus news"
              : "Lihat, edit, dan kelola semua berita kampus"
          }
          onBack={() => router.back()}
          isDarkMode={isDarkMode}
        />

        {/* Search and Filter */}
        <View className="px-6 py-4">
          {/* Search Bar */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search news..."
            placeholderID="Cari berita..."
            isDarkMode={isDarkMode}
            language={language}
          />

          {/* Category Filter */}
          <View className="mt-3">
            <TouchableOpacity
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className={`p-3 rounded-lg border flex-row justify-between items-center ${
                isDarkMode
                  ? "bg-gray-800 border-gray-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`${
                  !selectedCategory
                    ? isDarkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                    : isDarkMode
                      ? "text-white"
                      : "text-gray-800"
                }`}
              >
                {selectedCategory
                  ? categories.find((c) => c.value === selectedCategory)?.label[
                      language
                    ]
                  : language === "EN"
                    ? "All Categories"
                    : "Semua Kategori"}
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
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      onPress={() => {
                        setSelectedCategory(category.value);
                        setShowCategoryDropdown(false);
                      }}
                      className={`p-3 border-b ${
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      } ${selectedCategory === category.value ? "bg-blue-500" : ""}`}
                    >
                      <Text
                        className={`text-center ${
                          selectedCategory === category.value
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

          {/* Add News Button */}
          <TouchableOpacity
            className={`w-full p-3 rounded-xl flex-row items-center justify-center mt-3 ${
              isDarkMode ? "bg-red-600" : "bg-red-500"
            } shadow-md`}
            onPress={handleFloatingAddNews}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {language === "EN" ? "Add New News" : "Tambah Berita Baru"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* News List */}
        <View className="flex-1 px-6">
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {language === "EN" ? "Loading news..." : "Memuat berita..."}
              </Text>
            </View>
          ) : news.length === 0 ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
            >
              <EmptyState
                icon="document-text-outline"
                titleEN="No news found"
                titleID="Tidak ada berita ditemukan"
                subtitleEN={
                  searchQuery.trim()
                    ? `No news found for "${searchQuery}"`
                    : "No news articles have been published yet"
                }
                subtitleID={
                  searchQuery.trim()
                    ? `Tidak ada berita untuk "${searchQuery}"`
                    : "Belum ada berita yang diterbitkan"
                }
                isDarkMode={isDarkMode}
                language={language}
                containerStyle={{ paddingVertical: 80 }}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={news}
              renderItem={({ item }) => <NewsCard item={item} />}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={getRefreshControl("manageNews", onRefresh)}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() =>
                loadingMore ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#EF4444" />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        title={language === "EN" ? "Delete News?" : "Hapus Berita?"}
        itemName={newsToDelete?.title || ""}
        isDarkMode={isDarkMode}
        language={language}
        onCancel={cancelDeleteNews}
        onConfirm={confirmDeleteNews}
        isLoading={isDeleting}
      />
    </SafeAreaViewComponent>
  );
}
