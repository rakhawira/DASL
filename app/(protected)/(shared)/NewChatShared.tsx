import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useAvailableUsers } from "@/hooks/useChat";
import {
    ChatUser,
    Conversation,
    DraftConversation,
    NewChatProps,
} from "@/types/chat";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";

export function NewChat({
  user,
  isDarkMode,
  language,
  showToast,
  onBack,
  onConversationCreated,
  onDraftConversation,
  conversations = [],
}: NewChatProps) {
  const [mode, setMode] = useState<"personal" | "group">("personal");
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    loadingUsers,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    fetchAvailableUsers,
  } = useAvailableUsers(user?.id);

  useEffect(() => {
    fetchAvailableUsers();
  }, [fetchAvailableUsers]);

  const handleUserSelect = async (selectedUser: ChatUser) => {
    if (!user?.id) return;

    if (mode === "personal") {
      // Check if conversation with this user already exists (by name matching)
      const existingConversation = conversations.find(
        (conv: Conversation) =>
          conv.type === "direct" &&
          (conv.other_participant_name === selectedUser.name ||
            conv.creator_name === selectedUser.name),
      );

      if (existingConversation) {
        showToast(
          language === "EN"
            ? `Chat with ${selectedUser.name} already exists`
            : `Chat dengan ${selectedUser.name} sudah ada`,
          "info",
        );
        onConversationCreated(existingConversation);
        return;
      }

      // Create a DRAFT conversation (not saved to backend yet)
      // Only when user sends the first message, it will be saved
      const draftConversation: DraftConversation = {
        id: null,
        type: "direct",
        created_by: user.id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        draftParticipant: selectedUser,
      };

      showToast(
        language === "EN"
          ? `Chat with ${selectedUser.name} started (draft)`
          : `Chat dengan ${selectedUser.name} dimulai (draft)`,
        "info",
      );

      if (onDraftConversation) {
        onDraftConversation(draftConversation);
      }
    } else {
      // Toggle selection for group mode
      setSelectedUsers((prev) =>
        prev.find((u) => u.id === selectedUser.id)
          ? prev.filter((u) => u.id !== selectedUser.id)
          : [...prev, selectedUser],
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.id) return;
    if (selectedUsers.length < 2) {
      showToast(
        language === "EN"
          ? "Minimum 2 members required"
          : "Minimal 2 anggota diperlukan",
        "error",
      );
      return;
    }
    if (!groupName.trim()) {
      showToast(
        language === "EN" ? "Group name is required" : "Nama group wajib diisi",
        "error",
      );
      return;
    }

    // Create a DRAFT group conversation (not saved to backend yet)
    // Only when user sends the first message, it will be saved
    const draftConversation: DraftConversation = {
      id: null,
      type: "group",
      created_by: user.id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      draftTitle: groupName.trim(),
      draftParticipants: selectedUsers,
    };

    showToast(
      language === "EN"
        ? `Group "${groupName}" started (draft)`
        : `Group "${groupName}" dimulai (draft)`,
      "info",
    );

    setSelectedUsers([]);
    setGroupName("");

    if (onDraftConversation) {
      onDraftConversation(draftConversation);
    }
  };

  const handleModeChange = (newMode: "personal" | "group") => {
    setMode(newMode);
    setSelectedUsers([]);
    setGroupName("");
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "mahasiswa":
        return language === "EN" ? "Student" : "Mahasiswa";
      case "dosen":
        return language === "EN" ? "Lecturer" : "Dosen";
      case "admin":
        return language === "EN" ? "Admin" : "Admin";
      default:
        return role;
    }
  };

  const isUserSelected = (userId: number) =>
    selectedUsers.some((u) => u.id === userId);

  const renderUserItem = ({ item }: { item: ChatUser }) => {
    const selected = isUserSelected(item.id);

    return (
      <TouchableOpacity
        onPress={() => handleUserSelect(item)}
        disabled={loading}
        className={`mx-6 mb-3 p-4 rounded-2xl flex-row items-center ${
          selected
            ? "bg-red-50 border border-red-500"
            : isDarkMode
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
        } shadow-sm`}
        activeOpacity={0.7}
      >
        <View
          className={`w-12 h-12 rounded-full items-center justify-center ${
            selected ? "bg-red-500" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              selected
                ? "text-white"
                : isDarkMode
                  ? "text-gray-300"
                  : "text-gray-600"
            }`}
          >
            {selected && mode === "group" ? (
              <Ionicons name="checkmark" size={20} color="white" />
            ) : (
              item.name.charAt(0).toUpperCase()
            )}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`font-semibold ${
              selected
                ? "text-red-600"
                : isDarkMode
                  ? "text-white"
                  : "text-gray-800"
            }`}
          >
            {item.name}
          </Text>
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {item.username} • {getRoleLabel(item.role)}
          </Text>
          {(item.jurusan || item.fakultas) && (
            <Text
              className={`text-xs ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {item.fakultas}
              {item.fakultas && item.jurusan && " - "}
              {item.jurusan}
            </Text>
          )}
        </View>
        {mode === "personal" ? (
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={isDarkMode ? "#EF4444" : "#EF4444"}
          />
        ) : (
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={selected ? "#EF4444" : isDarkMode ? "#6B7280" : "#9CA3AF"}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["left", "right", "bottom"]}
    >
      <Header
        title={language === "EN" ? "New Chat" : "Obrolan Baru"}
        isDarkMode={isDarkMode}
        onBack={onBack}
      />

      {/* Search */}
      <View className="px-6 mb-4">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderEN="Search users..."
          placeholderID="Cari pengguna..."
          isDarkMode={isDarkMode}
          language={language}
          showClearButton
          onClear={() => setSearchQuery("")}
        />
      </View>

      {/* Mode Selector */}
      <View className="px-6 mb-4">
        <View
          className={`flex-row rounded-xl p-1 ${
            isDarkMode ? "bg-gray-800" : "bg-gray-200"
          }`}
        >
          <TouchableOpacity
            onPress={() => handleModeChange("personal")}
            className={`flex-1 py-2 rounded-lg ${
              mode === "personal"
                ? "bg-red-500"
                : isDarkMode
                  ? "bg-transparent"
                  : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                mode === "personal"
                  ? "text-white"
                  : isDarkMode
                    ? "text-gray-400"
                    : "text-gray-600"
              }`}
            >
              {language === "EN" ? "Personal" : "Personal"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleModeChange("group")}
            className={`flex-1 py-2 rounded-lg ${
              mode === "group"
                ? "bg-red-500"
                : isDarkMode
                  ? "bg-transparent"
                  : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-medium ${
                mode === "group"
                  ? "text-white"
                  : isDarkMode
                    ? "text-gray-400"
                    : "text-gray-600"
              }`}
            >
              {language === "EN" ? "Group" : "Group"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Group Name Input (Group Mode) */}
      {mode === "group" && (
        <View className="px-6 mb-3">
          <View
            className={`flex-row items-center px-4 py-3 rounded-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            } shadow-md`}
          >
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder={
                language === "EN"
                  ? "Enter group name..."
                  : "Masukkan nama group..."
              }
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              className="flex-1"
              style={{ color: isDarkMode ? "#FFFFFF" : "#000000" }}
            />
          </View>
        </View>
      )}

      {/* Selected Count (Group Mode) */}
      {mode === "group" && selectedUsers.length > 0 && (
        <View className="px-6 mb-2">
          <Text
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {language === "EN"
              ? `${selectedUsers.length} member${selectedUsers.length > 1 ? "s" : ""} selected`
              : `${selectedUsers.length} anggota dipilih`}
          </Text>
        </View>
      )}

      {/* Users list */}
      {loadingUsers ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDarkMode ? "#EF4444" : "#EF4444"}
          />
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          iconSize={48}
          titleEN={searchQuery ? "No users found" : "No users available"}
          titleID={
            searchQuery ? "Tidak ada pengguna" : "Tidak ada pengguna tersedia"
          }
          subtitleEN={
            searchQuery
              ? `No results for "${searchQuery}"`
              : "Start typing to search users"
          }
          subtitleID={
            searchQuery
              ? `Tidak ada hasil untuk "${searchQuery}"`
              : "Mulai mengetik untuk mencari pengguna"
          }
          isDarkMode={isDarkMode}
          language={language}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom:
              mode === "group" && selectedUsers.length > 0 ? 100 : 20,
          }}
        />
      )}

      {/* Bottom Action Bar (Group Mode) */}
      {mode === "group" && selectedUsers.length > 0 && (
        <View
          className={`absolute bottom-0 left-0 right-0 p-4 border-t ${
            isDarkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-200"
          }`}
        >
          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={loading || selectedUsers.length < 2 || !groupName.trim()}
            className={`py-4 rounded-xl ${
              selectedUsers.length < 2 || !groupName.trim() || loading
                ? "bg-gray-400"
                : "bg-red-500"
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-semibold">
                {language === "EN"
                  ? `Create Group (${selectedUsers.length})`
                  : `Buat Group (${selectedUsers.length})`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaViewComponent>
  );
}

export default NewChat;
