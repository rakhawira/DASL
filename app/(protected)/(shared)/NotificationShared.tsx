import Header from "@/components/Header";
import { getNotifications } from "@/services/api";
import { Notification } from "@/types/notifications";
import { User } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

interface NotificationTabProps {
  user: User | null;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function NotificationShared({
  user,
  isDarkMode,
  language,
  showToast,
}: NotificationTabProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications from backend based on real user data
  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await getNotifications({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        console.error("Failed to fetch notifications:", response.message);
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    };

    loadNotifications();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

  const markAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    showToast(
      language === "EN"
        ? "Notification marked as read"
        : "Notifikasi ditandai sebagai dibaca",
      "success",
    );
  };

  const markAsUnread = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: false }
          : notification,
      ),
    );
    showToast(
      language === "EN"
        ? "Notification marked as unread"
        : "Notifikasi ditandai sebagai belum dibaca",
      "success",
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true })),
    );
    showToast(
      language === "EN"
        ? "All notifications marked as read"
        : "Semua notifikasi ditandai sebagai dibaca",
      "success",
    );
  };

  const markAllAsUnread = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: false })),
    );
    showToast(
      language === "EN"
        ? "All notifications marked as unread"
        : "Semua notifikasi ditandai sebagai belum dibaca",
      "success",
    );
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Header
          title={language === "EN" ? "Notifications" : "Notifikasi"}
          isDarkMode={isDarkMode}
          onBack={handleClose}
          rightComponent={
            hasUnreadNotifications && (
              <TouchableOpacity
                onPress={markAllAsRead}
                activeOpacity={0.7}
                className={`px-3 py-1 rounded-full ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Mark All Read" : "Tandai Semua Dibaca"}
                </Text>
              </TouchableOpacity>
            )
          }
        />

        <ScrollView
          className="flex-1 px-6 py-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDarkMode ? "#3B82F6" : "#2563EB"}
              colors={[isDarkMode ? "#3B82F6" : "#2563EB"]}
            />
          }
        >
          {loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#3B82F6" : "#2563EB"}
              />
              <Text
                className={`mt-4 text-sm ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "EN" ? "Loading notifications..." : "Memuat notifikasi..."}
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={isDarkMode ? "#6B7280" : "#9CA3AF"}
              />
              <Text
                className={`mt-4 text-sm font-medium ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {language === "EN" ? "No notifications" : "Tidak ada notifikasi"}
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
              key={notification.id}
              className={`mb-4 p-4 rounded-xl ${
                isDarkMode ? "bg-gray-800" : "bg-gray-50"
              } border ${
                notification.isRead
                  ? isDarkMode
                    ? "border-gray-700 opacity-60"
                    : "border-gray-200 opacity-60"
                  : isDarkMode
                    ? "border-blue-600"
                    : "border-blue-400"
              }`}
              activeOpacity={0.7}
              onPress={() => {
                if (!notification.isRead) {
                  markAsRead(notification.id);
                }
                showToast(
                  language === "EN"
                    ? "Opening notification..."
                    : "Membuka notifikasi...",
                  "info",
                );
              }}
            >
              <View className="flex-row items-start">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    notification.type === "update"
                      ? "bg-green-100"
                      : notification.type === "news"
                        ? "bg-blue-100"
                        : notification.type === "points"
                          ? "bg-yellow-100"
                          : notification.type === "admin"
                            ? "bg-red-100"
                            : notification.type === "schedule"
                              ? "bg-purple-100"
                              : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name={
                      notification.type === "update"
                        ? "cloud-download-outline"
                        : notification.type === "news"
                          ? "newspaper-outline"
                          : notification.type === "points"
                            ? "trophy-outline"
                            : notification.type === "admin"
                              ? "people-outline"
                              : notification.type === "schedule"
                                ? "calendar-outline"
                                : "notifications-outline"
                    }
                    size={20}
                    color={
                      notification.type === "update"
                        ? "#10B981"
                        : notification.type === "news"
                          ? "#3B82F6"
                          : notification.type === "points"
                            ? "#F59E0B"
                            : notification.type === "admin"
                              ? "#EF4444"
                              : notification.type === "schedule"
                                ? "#8B5CF6"
                                : "#6B7280"
                    }
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text
                      className={`font-semibold mb-1 flex-1 ${
                        notification.isRead
                          ? isDarkMode
                            ? "text-gray-400"
                            : "text-gray-600"
                          : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                      }`}
                    >
                      {notification.title}
                    </Text>
                    {!notification.isRead && (
                      <View className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2" />
                    )}
                  </View>
                  <Text
                    className={`text-sm mb-2 ${
                      notification.isRead
                        ? isDarkMode
                          ? "text-gray-500"
                          : "text-gray-500"
                        : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    {notification.message}
                  </Text>
                  <View className="flex-row justify-between items-center">
                    <Text
                      className={`text-xs ${
                        isDarkMode ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      {notification.time}
                    </Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        if (notification.isRead) {
                          markAsUnread(notification.id);
                        } else {
                          markAsRead(notification.id);
                        }
                      }}
                      activeOpacity={0.7}
                      className={`px-2 py-1 rounded-full ${
                        isDarkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {notification.isRead
                          ? language === "EN"
                            ? "Mark as Unread"
                            : "Tandai Belum Dibaca"
                          : language === "EN"
                            ? "Mark as Read"
                            : "Tandai Dibaca"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaViewComponent>
  );
}
