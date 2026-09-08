import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { DOSEN_TYPES, MAJORS, ROLES } from "@/constants/academicData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { deleteUser, getUsers } from "@/services/api";
import { User } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function AdminUsersTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      // Check for network error
      if (error.code === "NETWORK_ERROR" || error.code === "ECONNABORTED" || !error.response) {
        showToast(
          language === "EN"
            ? "Network error. Please check your internet connection."
            : "Error jaringan. Silakan periksa koneksi internet Anda.",
          "error",
        );
      } else {
        showToast(
          language === "EN" ? "Failed to load users" : "Gagal memuat pengguna",
          "error",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    setIsLoading(true);
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    router.push("/admin/pages/AddUserPage");
  };

  const handleEditUser = (user: User) => {
    router.push({
      pathname: "/admin/pages/EditUserPage",
      params: { userId: user.id.toString() },
    });
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      showToast(
        language === "EN"
          ? "User deleted successfully"
          : "Pengguna berhasil dihapus",
        "success",
      );
      fetchUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast(
        language === "EN"
          ? "Failed to delete user"
          : "Gagal menghapus pengguna",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const UserCard = ({ user }: { user: User }) => (
    <View
      className={`mb-3 p-4 rounded-xl ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md`}
    >
      <View className="flex-row">
        <View className="w-12 h-12 bg-red-500 rounded-full items-center justify-center mr-3">
          <Ionicons name="person-outline" size={20} color="white" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-2">
              <Text
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                {user.name}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => handleEditUser(user)}
                className="p-1 mr-1"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={isDarkMode ? "#60A5FA" : "#3B82F6"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteUser(user)}
                className="p-1"
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={isDarkMode ? "#F87171" : "#EF4444"}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {user.username}
          </Text>
          <View className="flex-row items-center mt-1 flex-wrap gap-1">
            <Text
              className={`text-xs px-2 py-1 rounded ${
                user.role === "admin"
                  ? "bg-red-100 text-red-600"
                  : user.role === "dosen"
                    ? "bg-blue-100 text-blue-600"
                    : user.role === "staff"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {ROLES.find((r) => r.value === user.role)?.label[
                language
              ]?.toUpperCase() || user.role.toUpperCase()}
            </Text>
            {user.role === "dosen" && user.dosenType && (
              <Text
                className={`text-xs px-2 py-1 rounded ${
                  user.dosenType === "wali"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-orange-100 text-orange-600"
                }`}
              >
                {DOSEN_TYPES.find((dt) => dt.value === user.dosenType)?.label[
                  language
                ]?.toUpperCase() || user.dosenType.toUpperCase()}
              </Text>
            )}
            {user.jurusan && (
              <Text
                className={`text-xs px-2 py-1 rounded bg-teal-100 text-teal-600`}
              >
                {MAJORS.find((m) => m.value === user.jurusan)?.label[
                  language
                ]?.toUpperCase() || user.jurusan.toUpperCase()}
              </Text>
            )}
          </View>
        </View>
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
          title={language === "EN" ? "Manage Users" : "Manajemen Pengguna"}
          subtitle={
            language === "EN"
              ? `Total ${users.length} users`
              : `Total ${users.length} pengguna`
          }
          isDarkMode={isDarkMode}
        />

        <View className="px-6 mb-4">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderEN="Search users..."
            placeholderID="Cari pengguna..."
            isDarkMode={isDarkMode}
            language={language}
          />
        </View>

        {/* Add Button - Fixed, not scrollable */}
        <View className="px-6 mb-4">
          <TouchableOpacity
            className={`p-4 rounded-xl flex-row items-center justify-center ${
              isDarkMode ? "bg-red-600" : "bg-red-500"
            }`}
            onPress={handleAddUser}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {language === "EN" ? "Add New User" : "Tambah Pengguna Baru"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <View className="px-6 flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
              <Text
                className={`mt-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                {language === "EN" ? "Loading users..." : "Memuat pengguna..."}
              </Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#EF4444"
                  colors={["#EF4444"]}
                />
              }
            >
              <EmptyState
                icon="people-outline"
                titleEN="No users found"
                titleID="Tidak ada pengguna ditemukan"
                subtitleEN={
                  searchQuery.trim()
                    ? `No users found for "${searchQuery}"`
                    : "No users are registered in the system"
                }
                subtitleID={
                  searchQuery.trim()
                    ? `Tidak ada pengguna untuk "${searchQuery}"`
                    : "Tidak ada pengguna yang terdaftar dalam sistem"
                }
                isDarkMode={isDarkMode}
                language={language}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={({ item }) => <UserCard user={item} />}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#EF4444"
                  colors={["#EF4444"]}
                />
              }
            />
          )}
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        title={language === "EN" ? "Delete User?" : "Hapus Pengguna?"}
        itemName={userToDelete?.name || ""}
        isDarkMode={isDarkMode}
        language={language}
        onCancel={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
        isLoading={isDeleting}
      />
    </SafeAreaViewComponent>
  );
}
