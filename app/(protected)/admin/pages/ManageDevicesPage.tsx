import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useTimezone } from "@/hooks/useTimezone";
import { deleteDevice, getDevices } from "@/services/api";
import { Device, DeviceStats } from "@/types/device";
import { formatDate } from "@/utils/dateUtils";
import { getDeviceStatusColor, getDeviceStatusText } from "@/utils/statusUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export default function ManageDevicesTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { timezoneInfo } = useTimezone();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    online: 0,
    offline: 0,
    error: 0,
    in_use: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, [filterStatus, searchQuery]);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const params = filterStatus ? { status: filterStatus } : undefined;
      const data = await getDevices(params);

      if (data.success) {
        let filteredDevices = data.data.devices;
        let deviceStats = data.data.stats || {
          total: 0,
          online: 0,
          offline: 0,
          error: 0,
          in_use: 0,
        };

        // Apply client-side search filter
        if (searchQuery.trim()) {
          filteredDevices = filteredDevices.filter(
            (device: Device) =>
              device.device_name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              device.device_id
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              device.location
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              device.ip_address
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              device.mac_address
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()),
          );
        }
        setDevices(filteredDevices);
        setStats(deviceStats);
      } else {
        showToast(data.error || "Failed to fetch devices", "error");
      }
    } catch (error) {
      showToast("Network error while fetching devices", "error");
      console.error("Error fetching devices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  };

  const handleEditDevice = (device: Device) => {
    router.push({
      pathname: "/admin/pages/EditDevicesPage",
      params: {
        deviceId: device.device_id,
        deviceName: device.device_name,
        deviceLocation: device.location,
        macAddress: device.mac_address,
      },
    });
  };

  const handleDeleteDevice = (device: Device) => {
    setDeviceToDelete(device);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      setIsDeleting(true);
      const data = await deleteDevice(deviceToDelete.device_id);

      if (data.success) {
        showToast(
          language === "EN"
            ? "Device deleted successfully"
            : "Perangkat berhasil dihapus",
          "success",
        );
        fetchDevices();
        setShowDeleteModal(false);
        setDeviceToDelete(null);
      } else {
        showToast(
          data.error ||
            (language === "EN"
              ? "Failed to delete device"
              : "Gagal menghapus perangkat"),
          "error",
        );
      }
    } catch (error) {
      showToast(
        language === "EN"
          ? "Network error while deleting device"
          : "Kesalahan jaringan saat menghapus perangkat",
        "error",
      );
      console.error("Error deleting device:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeviceToDelete(null);
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return language === "EN" ? "Just now" : "Baru saja";
    } else if (diffMins < 60) {
      return `${diffMins} ${language === "EN" ? "min ago" : "menit lalu"}`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} ${language === "EN" ? "hour ago" : "jam lalu"}`;
    } else {
      return formatDate(lastSeen, timezoneInfo.timezone);
    }
  };

  const DeviceCard = ({ device }: { device: Device }) => (
    <View
      className={`p-4 rounded-xl mb-4 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text
            className={`font-bold text-lg ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {device.device_name || device.device_id}
          </Text>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            ID: {device.device_id}
          </Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{
            backgroundColor: getDeviceStatusColor(device.status) + "20",
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: getDeviceStatusColor(device.status) }}
          >
            {getDeviceStatusText(device.status, language)}
          </Text>
        </View>
      </View>

      <View className="space-y-2 mb-4">
        {device.location && (
          <View className="flex-row items-center">
            <Ionicons
              name="location-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {device.location}
            </Text>
          </View>
        )}
        {device.ip_address && (
          <View className="flex-row items-center">
            <Ionicons
              name="wifi-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {device.ip_address}
            </Text>
          </View>
        )}
        {device.mac_address && (
          <View className="flex-row items-center">
            <Ionicons
              name="hardware-chip-outline"
              size={16}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {device.mac_address}
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
            {formatLastSeen(device.last_seen)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 bg-blue-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => handleEditDevice(device)}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text className="ml-1 text-white text-sm font-medium">
            {language === "EN" ? "Edit" : "Ubah"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-red-500 py-2 rounded-lg flex-row items-center justify-center"
          onPress={() => handleDeleteDevice(device)}
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
        <Header
          title={language === "EN" ? "Manage Devices" : "Kelola Perangkat"}
          subtitle={
            language === "EN"
              ? "Monitor ESP32 devices"
              : "Monitor perangkat ESP32"
          }
          isDarkMode={isDarkMode}
          onBack={() => router.back()}
        />

        {/* Stats Cards */}
        <View className="px-6 mb-4">
          <View className="flex-row gap-2">
            <View className="flex-1 p-4 rounded-lg bg-blue-500">
              <Text className="text-white text-center font-bold text-lg">
                {stats.total}
              </Text>
              <Text className="text-white text-center text-xs">
                {language === "EN" ? "Total" : "Total"}
              </Text>
            </View>
            <View className="flex-1 p-4 rounded-lg bg-green-500">
              <Text className="text-white text-center font-bold text-lg">
                {stats.online}
              </Text>
              <Text className="text-white text-center text-xs">
                {language === "EN" ? "Online" : "Online"}
              </Text>
            </View>
            <View className="flex-1 p-4 rounded-lg bg-red-500">
              <Text className="text-white text-center font-bold text-lg">
                {stats.offline}
              </Text>
              <Text className="text-white text-center text-xs">
                {language === "EN" ? "Offline" : "Offline"}
              </Text>
            </View>
            <View className="flex-1 p-4 rounded-lg bg-yellow-500">
              <Text className="text-white text-center font-bold text-lg">
                {stats.error}
              </Text>
              <Text className="text-white text-center text-xs">
                {language === "EN" ? "Error" : "Error"}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-6 mb-4">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search devices..."
            placeholderID="Cari perangkat..."
            isDarkMode={isDarkMode}
            language={language}
          />
        </View>

        {/* Filter Buttons */}
        <View className="px-6 mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === ""
                    ? "bg-blue-500"
                    : isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-200"
                }`}
                onPress={() => setFilterStatus("")}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterStatus === ""
                      ? "text-white"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "All" : "Semua"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "online"
                    ? "bg-green-500"
                    : isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-200"
                }`}
                onPress={() => setFilterStatus("online")}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterStatus === "online"
                      ? "text-white"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Online" : "Online"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "offline"
                    ? "bg-red-500"
                    : isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-200"
                }`}
                onPress={() => setFilterStatus("offline")}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterStatus === "offline"
                      ? "text-white"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Offline" : "Offline"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  filterStatus === "error"
                    ? "bg-yellow-500"
                    : isDarkMode
                      ? "bg-gray-700"
                      : "bg-gray-200"
                }`}
                onPress={() => setFilterStatus("error")}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterStatus === "error"
                      ? "text-white"
                      : isDarkMode
                        ? "text-white"
                        : "text-gray-700"
                  }`}
                >
                  {language === "EN" ? "Error" : "Error"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Device List */}
        <View className="flex-1 px-6 pb-6">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                {language === "EN"
                  ? "Loading devices..."
                  : "Memuat perangkat..."}
              </Text>
            </View>
          ) : devices.length === 0 ? (
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
                icon="hardware-chip-outline"
                titleEN="No devices found"
                titleID="Tidak ada perangkat ditemukan"
                subtitleEN="No ESP32 devices are currently registered"
                subtitleID="Tidak ada perangkat ESP32 yang terdaftar saat ini"
                isDarkMode={isDarkMode}
                language={language}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={devices}
              renderItem={({ item }) => <DeviceCard device={item} />}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#EF4444"]}
                  tintColor="#EF4444"
                />
              }
            />
          )}
        </View>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          visible={showDeleteModal}
          title={language === "EN" ? "Delete Device?" : "Hapus Perangkat?"}
          itemName={
            deviceToDelete?.device_name || deviceToDelete?.device_id || ""
          }
          isDarkMode={isDarkMode}
          language={language}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          isLoading={isDeleting}
        />
      </View>
    </SafeAreaViewComponent>
  );
}
