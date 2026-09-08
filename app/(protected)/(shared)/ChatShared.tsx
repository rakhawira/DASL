import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import EmptyState from "@/components/EmptyState";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { useChatConversations } from "@/hooks/useChat";
import { ChatAPI } from "@/services/api";
import { websocketService } from "@/services/websocketService";
import { ChatListProps, Conversation } from "@/types/chat";
import { getConversationTitle } from "@/utils/chatUtils";
import { formatChatTime } from "@/utils/dateUtils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";
import { useTimezone } from "../../../hooks/useTimezone";

// Export sub-components
export { NewChat } from "./NewChatShared";
export { ViewChat } from "./ViewChatShared";

export function ChatList({
  user,
  isDarkMode,
  language,
  showToast,
  onSelectConversation,
  onNewChat,
}: ChatListProps) {
  const {
    conversations,
    refreshing,
    onRefresh,
    fetchConversations,
    setConversations,
  } = useChatConversations(user?.id);
  const { timezoneInfo } = useTimezone();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);

  // Track screen focus state
  const isScreenFocusedRef = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      isScreenFocusedRef.current = true;
      console.log("[ChatList] Screen focused - WebSocket can connect");
      return () => {
        isScreenFocusedRef.current = false;
        console.log(
          "[ChatList] Screen unfocused - WebSocket should disconnect",
        );
        // Force disconnect WebSocket when leaving chat tab
        websocketService.disconnect();
      };
    }, []),
  );

  // Setup WebSocket for realtime conversation updates
  useEffect(() => {
    if (!user?.id || !isScreenFocusedRef.current) return;

    // Connect to WebSocket
    websocketService.connect().catch((error: any) => {
      console.error("[ChatList] Failed to connect to WebSocket:", error);
    });

    // Handle conversation updates
    websocketService.onMessage("conversation_updated", (message: any) => {
      if (message.data) {
        setConversations((prevConversations) =>
          prevConversations.map((conv) =>
            conv.id === message.data.id ? { ...conv, ...message.data } : conv,
          ),
        );
      }
    });

    return () => {
      websocketService.offMessage("conversation_updated");
      // Note: Don't disconnect WebSocket here as it's handled by useFocusEffect
    };
  }, [user?.id, setConversations]);

  const filteredConversations = conversations.filter((conv) => {
    const title = getConversationTitle(conv, user?.id, language).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  const handleDeleteConversation = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    setDeleteModalVisible(true);
    setSelectedConversationId(null);
  };

  const handleConversationPress = (conversation: Conversation) => {
    if (selectedConversationId !== null) {
      setSelectedConversationId(null);
      return;
    }
    onSelectConversation(conversation);
  };

  const handleConversationLongPress = (conversation: Conversation) => {
    if (selectedConversationId === conversation.id) {
      setSelectedConversationId(null);
    } else {
      setSelectedConversationId(conversation.id);
    }
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete || !user?.id) return;
    setDeletingId(conversationToDelete.id);
    setDeleteModalVisible(false);
    try {
      await ChatAPI.leaveConversation(conversationToDelete.id, user.id);
      showToast(
        language === "EN" ? "Conversation deleted" : "Percakapan dihapus",
        "success",
      );
      fetchConversations();
    } catch (error) {
      showToast(
        language === "EN"
          ? "Failed to delete conversation"
          : "Gagal menghapus percakapan",
        "error",
      );
    } finally {
      setDeletingId(null);
      setConversationToDelete(null);
      setSelectedConversationId(null);
    }
  };

  const hasSelection = selectedConversationId !== null;

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isSelected = selectedConversationId === item.id;
    const isBlurred = hasSelection && !isSelected;

    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleConversationLongPress(item)}
        disabled={deletingId === item.id}
        className={`mx-6 mb-3 p-4 rounded-2xl ${
          isDarkMode
            ? isSelected
              ? "bg-red-900/20 border border-red-700"
              : "bg-gray-800 border border-gray-700"
            : isSelected
              ? "bg-red-50 border border-red-200"
              : "bg-white border border-gray-200"
        } ${deletingId === item.id ? "opacity-50" : ""} ${isBlurred ? "opacity-20" : ""} shadow-sm`}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <Ionicons
              name={item.type === "group" ? "people" : "person"}
              size={24}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row justify-between items-center">
              <Text
                className={`font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
                numberOfLines={1}
              >
                {getConversationTitle(item, user?.id, language)}
              </Text>
              <Text
                className={`text-xs ${
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {formatChatTime(
                  item.last_message_at,
                  language,
                  timezoneInfo.timezone,
                )}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text
                className={`text-sm flex-1 mr-2 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
                numberOfLines={1}
              >
                {item.type === "group" &&
                item.last_message_sender_name &&
                item.last_message
                  ? `${item.last_message_sender_name}: ${item.last_message}`
                  : item.last_message ||
                    (language === "EN" ? "No messages yet" : "Belum ada pesan")}
              </Text>
              {(item.unread_count || 0) > 0 && !isSelected && (
                <View className="bg-red-500 rounded-full px-2 py-0.5 min-w-[20px] items-center justify-center">
                  <Text className="text-white text-xs font-medium">
                    {item.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isSelected && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteConversation(item);
              }}
              className="ml-3 p-2 rounded-2xl bg-red-500"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />
      <Header
        title={language === "EN" ? "Chat" : "Obrolan"}
        subtitle={
          language === "EN" ? "Start a conversation" : "Mulai percakapan"
        }
        isDarkMode={isDarkMode}
        rightComponent={
          <TouchableOpacity
            onPress={onNewChat}
            className={`p-2 rounded-2xl ${
              isDarkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="chat-plus-outline"
              size={24}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View className="px-6 mb-2">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderEN="Search conversations..."
          placeholderID="Cari percakapan..."
          isDarkMode={isDarkMode}
          language={language}
          showClearButton
          onClear={() => setSearchQuery("")}
        />
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          iconSize={64}
          titleEN="No conversations yet"
          titleID="Belum ada obrolan"
          subtitleEN="Start a new chat by tapping the icon above"
          subtitleID="Mulai obrolan baru dengan mengetuk ikon di atas"
          isDarkMode={isDarkMode}
          language={language}
        />
      ) : filteredConversations.length === 0 ? (
        <EmptyState
          icon="search-outline"
          iconSize={48}
          titleEN="No conversations found"
          titleID="Tidak ada percakapan"
          subtitleEN={`No results for "${searchQuery}"`}
          subtitleID={`Tidak ada hasil untuk "${searchQuery}"`}
          isDarkMode={isDarkMode}
          language={language}
        />
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EF4444"]}
              tintColor="#EF4444"
            />
          }
          onTouchStart={() => {
            if (selectedConversationId !== null) {
              setSelectedConversationId(null);
            }
          }}
        />
      )}

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        isDarkMode={isDarkMode}
        language={language}
        itemName={
          conversationToDelete
            ? getConversationTitle(conversationToDelete, user?.id, language)
            : ""
        }
        title={language === "EN" ? "Delete Conversation?" : "Hapus Percakapan?"}
        message={
          language === "EN"
            ? "This will only remove the conversation from your view. Other participants will still see it."
            : "Ini hanya menghapus percakapan dari tampilan Anda. Peserta lain masih dapat melihatnya."
        }
        warningText=""
        onCancel={() => {
          setDeleteModalVisible(false);
          setConversationToDelete(null);
        }}
        onConfirm={confirmDeleteConversation}
        isLoading={deletingId !== null}
      />
    </SafeAreaViewComponent>
  );
}

// Default export for backward compatibility
export default ChatList;
