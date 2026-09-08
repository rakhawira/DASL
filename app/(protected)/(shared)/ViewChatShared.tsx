import { ChatInput } from "@/components/ChatInput";
import Header from "@/components/Header";
import { useChatMessages } from "@/hooks/useChat";
import { useTimezone } from "@/hooks/useTimezone";
import { ChatAPI } from "@/services/api";
import { websocketService } from "@/services/websocketService";
import {
    ChatMessage,
    ChatParticipant,
    Conversation,
    DraftConversation,
    ViewChatProps,
} from "@/types/chat";
import { getConversationTitle } from "@/utils/chatUtils";
import { formatChatTime } from "@/utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    LayoutChangeEvent,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Tipe literal untuk bahasa yang didukung.
// Jika sudah didefinisikan di @/types/chat, hapus baris ini
// dan import Language dari sana.
type Language = "EN" | "ID";

// ─────────────────────────────────────────────
// Sub-component: MessageBubble
// Dipisah & di-memo agar tidak re-render saat
// state parent berubah (misal: isAtBottom, loading)
// ─────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isGroupChat: boolean;
  isDarkMode: boolean;
  language: Language;
  timezone: string;
  onLongPress: (message: ChatMessage) => void;
}

const MessageBubble = React.memo(
  ({
    message,
    isOwn,
    isGroupChat,
    isDarkMode,
    language,
    timezone,
    onLongPress,
  }: MessageBubbleProps) => {
    const isRecalled = message.is_recalled;

    return (
      <TouchableOpacity
        key={message.id}
        activeOpacity={0.8}
        onLongPress={() => onLongPress(message)}
        delayLongPress={200}
        className={`mb-3 ${isOwn ? "items-end" : "items-start"}`}
      >
        {!isOwn && isGroupChat && (
          <Text
            className={`text-xs mb-1 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {message.sender_name}
          </Text>
        )}
        <View
          className={`max-w-[80%] px-4 py-2 rounded-2xl ${
            isOwn
              ? isDarkMode
                ? "bg-red-600"
                : "bg-red-500"
              : isDarkMode
                ? "bg-gray-700"
                : "bg-gray-200"
          } ${isRecalled ? "opacity-60" : ""}`}
        >
          <Text
            className={`text-sm ${
              isOwn ? "text-white" : isDarkMode ? "text-white" : "text-gray-800"
            } ${isRecalled ? "italic" : ""}`}
          >
            {isRecalled
              ? language === "EN"
                ? "This message has been recalled"
                : "Pesan telah ditarik"
              : message.message}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text
              className={`text-xs ${
                isOwn
                  ? "text-red-200"
                  : isDarkMode
                    ? "text-gray-400"
                    : "text-gray-500"
              }`}
            >
              {formatChatTime(message.created_at, language, timezone)}
            </Text>
            {message.is_edited && !isRecalled && (
              <Text
                className={`text-xs ml-1 ${
                  isOwn
                    ? "text-red-200"
                    : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                }`}
              >
                • {language === "EN" ? "edited" : "diedit"}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// ─────────────────────────────────────────────
// Main Component: ViewChat
// ─────────────────────────────────────────────
export function ViewChat({
  user,
  isDarkMode,
  language: languageRaw,
  showToast,
  conversation,
  onBack,
  onConversationUpdate,
  onConversationCreated,
}: ViewChatProps) {
  // Cast ke Language — ViewChatProps mungkin masih bertipe string.
  // Nilai yang valid hanya "EN" | "ID"; cast ini aman selama
  // pemanggil selalu meneruskan nilai yang benar.
  const language = languageRaw as Language;
  const isDraft = conversation.id === null;
  const { timezoneInfo } = useTimezone();
  const insets = useSafeAreaInsets();

  const [messageText, setMessageText] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);

  const [loading, setLoading] = useState(false);
  const [conversationDetails, setConversationDetails] =
    useState<Conversation | null>(null);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null,
  );
  const [editText, setEditText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );
  const [showActionModal, setShowActionModal] = useState(false);

  const messageInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIX #3: Ref untuk mendeteksi initial load vs. pesan baru
  // agar scrollToBottom tidak dipanggil dua kali saat pertama kali load.
  const hasMountedRef = useRef(false);

  const {
    messages,
    loadingMessages,
    fetchMessages,
    pollNewMessages,
    editMessage,
    recallMessage,
    deleteMessageForSelf,
  } = useChatMessages(isDraft ? undefined : conversation.id, user?.id);

  // FIX #1: Hapus stableFetchMessages & stablePollNewMessages.
  // Fungsi dari hook seharusnya sudah stabil (dibuat dengan useCallback di dalam hook).
  // Membungkus ulang dengan useCallback di sini tidak menambah nilai dan
  // membuat dependency array pada useEffect di bawah menjadi tidak akurat.

  // Scroll to bottom helper
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 10); // Reduced from 100ms to 10ms for faster response
  }, []);

  // Fetch conversation details and participants
  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (isDraft || !user?.id) {
        setLoadingDetails(false);
        return;
      }
      try {
        setLoadingDetails(true);
        const [conversationsRes, participantsRes] = await Promise.all([
          ChatAPI.getConversations(user.id),
          ChatAPI.getParticipants(conversation.id),
        ]);

        if (conversationsRes.success) {
          const fullConversation = conversationsRes.data.find(
            (c: Conversation) => c.id === conversation.id,
          );
          if (fullConversation) {
            setConversationDetails(fullConversation);
          }
        }

        if (participantsRes.success) {
          setParticipants(participantsRes.data);
        }
      } catch (error) {
        console.error("Error fetching conversation details:", error);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchConversationDetails();
  }, [conversation.id, user?.id, isDraft]);

  // FIX #2: Setup polling — pakai fetchMessages & pollNewMessages langsung
  // (bukan stableFetchMessages/stablePollNewMessages yang sudah dihapus).
  // Reset hasMountedRef saat conversation.id berubah agar scroll initial
  // bekerja dengan benar saat berpindah percakapan.
  // REMOVED: Polling fallback since WebSocket now provides true realtime updates
  useEffect(() => {
    if (!isDraft && conversation.id) {
      hasMountedRef.current = false;
      fetchMessages();

      // No polling needed - WebSocket handles realtime updates
      // pollingRef.current = setInterval(() => {
      //   if (!websocketService.isConnected()) {
      //     pollNewMessages();
      //   }
      // }, 3000);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [conversation.id, fetchMessages, pollNewMessages, isDraft]);

  // Setup WebSocket connection for realtime chat — skip for drafts
  useEffect(() => {
    if (!isDraft && conversation.id && user?.id) {
      let connectionHandler: ((connected: boolean) => void) | null = null;

      websocketService.connect().catch((error: any) => {
        console.error("[ViewChat] Failed to connect to WebSocket:", error);
      });

      connectionHandler = (connected: boolean) => {
        if (connected) {
          websocketService.joinChatRoom(conversation.id, user.id);
        }
      };

      websocketService.onConnection(connectionHandler);

      if (websocketService.isConnected()) {
        websocketService.joinChatRoom(conversation.id, user.id);
      }

      return () => {
        if (websocketService.isConnected()) {
          websocketService.leaveChatRoom(conversation.id, user.id);
        }
        if (connectionHandler) {
          websocketService.offConnection(connectionHandler);
        }
      };
    }
  }, [conversation.id, user?.id, isDraft]);

  // FIX #3: Gabungkan dua useEffect scroll menjadi satu.
  // - Initial load (hasMountedRef.current === false): scroll tanpa animasi
  //   agar tidak terlihat "melompat" dari atas ke bawah.
  // - Pesan baru masuk (hasMountedRef.current === true): scroll dengan
  //   animasi hanya jika user sudah berada di bagian bawah.
  useEffect(() => {
    if (messages.length === 0) return;

    // Saat user mengetik, jangan biarkan scroll effect
    // membuat view “mengambil” posisi yang tidak konsisten.
    // Fokusnya: menjaga input & view chat tetap stabil (bottom).
    if (isUserTyping) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      scrollToBottom(false);
    } else if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom, isUserTyping]);

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      if (isUserTyping) return;
      if (isAtBottom) scrollToBottom();
    });
    return () => sub.remove();
  }, [isAtBottom, scrollToBottom, isUserTyping]);

  // Memoized conversation title
  const conversationTitle = useMemo(
    () =>
      loadingDetails
        ? language === "EN"
          ? "Loading..."
          : "Memuat..."
        : getConversationTitle(
            conversationDetails || conversation,
            user?.id,
            language,
          ),
    [loadingDetails, conversationDetails, conversation, user?.id, language],
  );

  // Memoized subtitle
  const conversationSubtitle = useMemo(() => {
    if (isDraft) {
      if (
        conversation.type === "direct" &&
        (conversation as DraftConversation).draftParticipant
      ) {
        return (conversation as DraftConversation).draftParticipant?.username;
      }
      if (
        conversation.type === "group" &&
        (conversation as DraftConversation).draftParticipants
      ) {
        const count = (conversation as DraftConversation).draftParticipants
          ?.length;
        return `${count} ${language === "EN" ? "members" : "anggota"}`;
      }
      return undefined;
    }
    if (
      (conversationDetails?.type === "group" ||
        conversation.type === "group") &&
      participants.length > 0
    ) {
      return participants.map((p) => p.name || p.username).join(", ");
    }
    return undefined;
  }, [isDraft, conversation, conversationDetails, participants, language]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user?.id) return;

    setLoading(true);
    let currentConversation = conversation;

    // Jika draft, buat conversation terlebih dahulu
    if (isDraft) {
      const draftConv = conversation as DraftConversation;
      let newConversation: Conversation | null = null;

      try {
        if (draftConv.type === "direct" && draftConv.draftParticipant) {
          const response = await ChatAPI.createConversation({
            type: "direct",
            created_by: user.id,
            participant_ids: [draftConv.draftParticipant.id],
          });
          if (response.success) newConversation = response.data;
        } else if (
          draftConv.type === "group" &&
          draftConv.draftParticipants &&
          draftConv.draftParticipants.length >= 2
        ) {
          const response = await ChatAPI.createConversation({
            type: "group",
            title: draftConv.draftTitle || "New Group",
            created_by: user.id,
            participant_ids: draftConv.draftParticipants.map((p) => p.id),
          });
          if (response.success) newConversation = response.data;
        }

        if (!newConversation) {
          setLoading(false);
          showToast(
            language === "EN"
              ? "Failed to create conversation"
              : "Gagal membuat percakapan",
            "error",
          );
          return;
        }

        currentConversation = newConversation;
        onConversationCreated?.(newConversation);
      } catch (error) {
        console.error("Error creating conversation:", error);
        setLoading(false);
        showToast(
          language === "EN"
            ? "Failed to create conversation"
            : "Gagal membuat percakapan",
          "error",
        );
        return;
      }
    }

    // Kirim pesan via API
    try {
      const response = await ChatAPI.sendMessage({
        conversation_id: currentConversation.id as number,
        sender_id: user.id,
        message: messageText.trim(),
      });

      setLoading(false);

      if (response.success) {
        setMessageText("");
        setIsUserTyping(false);
        setIsAtBottom(true);

        // Pastikan UI langsung menampilkan pesan terbaru,
        // walaupun websocket event terlambat / tidak sampai untuk sender.
        await fetchMessages();

        // Hindari "double animation"/lompatan scroll saat fetchMessages
        // memicu useEffect [messages] juga.
        scrollToBottom(false);
        Keyboard.dismiss();
        messageInputRef.current?.blur();
        onConversationUpdate?.({
          ...(currentConversation as Conversation),
          last_message: response.data.message,
          last_message_at: response.data.created_at,
        });
      } else {
        showToast(
          language === "EN" ? "Failed to send message" : "Gagal mengirim pesan",
          "error",
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setLoading(false);
      showToast(
        language === "EN" ? "Failed to send message" : "Gagal mengirim pesan",
        "error",
      );
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    setLoading(true);
    const result = await editMessage(editingMessage.id, editText.trim());
    setLoading(false);

    if (result) {
      setEditingMessage(null);
      setEditText("");
      showToast(
        language === "EN" ? "Message updated" : "Pesan diperbarui",
        "success",
      );
    } else {
      showToast(
        language === "EN"
          ? "Failed to update message"
          : "Gagal memperbarui pesan",
        "error",
      );
    }
  };

  const handleRecallMessage = async (message: ChatMessage) => {
    Alert.alert(
      language === "EN" ? "Delete for Everyone" : "Hapus untuk Semua",
      language === "EN"
        ? "Are you sure you want to delete this message for everyone? This action cannot be undone."
        : "Apakah Anda yakin ingin menghapus pesan ini untuk semua orang? Tindakan ini tidak dapat dibatalkan.",
      [
        { text: language === "EN" ? "Cancel" : "Batal", style: "cancel" },
        {
          text: language === "EN" ? "Delete" : "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const result = await recallMessage(message.id);
            setLoading(false);
            if (result) {
              showToast(
                language === "EN"
                  ? "Message deleted for everyone"
                  : "Pesan dihapus untuk semua",
                "success",
              );
            } else {
              showToast(
                language === "EN"
                  ? "Failed to delete message"
                  : "Gagal menghapus pesan",
                "error",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteForSelf = async (message: ChatMessage) => {
    Alert.alert(
      language === "EN" ? "Delete Message" : "Hapus Pesan",
      language === "EN"
        ? "This message will be deleted for you only."
        : "Pesan ini akan dihapus hanya untuk Anda.",
      [
        { text: language === "EN" ? "Cancel" : "Batal", style: "cancel" },
        {
          text: language === "EN" ? "Delete" : "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const result = await deleteMessageForSelf(message.id);
            setLoading(false);
            if (!result) {
              showToast(
                language === "EN"
                  ? "Failed to delete message"
                  : "Gagal menghapus pesan",
                "error",
              );
            }
          },
        },
      ],
    );
  };

  // FIX #4: Bungkus dengan useCallback agar tidak dibuat ulang setiap render.
  const openMessageActions = useCallback((message: ChatMessage) => {
    setSelectedMessage(message);
    setShowActionModal(true);
  }, []);

  const closeMessageActions = useCallback(() => {
    setShowActionModal(false);
    setSelectedMessage(null);
  }, []);

  const startEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessage(message);
    setEditText(message.message);
    setShowActionModal(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
    setEditText("");
  }, []);

  const renderMessageActionsModal = () => {
    if (!selectedMessage) return null;
    const isOwn = selectedMessage.sender_id === user?.id;

    return (
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={closeMessageActions}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={closeMessageActions}
        >
          <View
            className={`w-64 rounded-2xl overflow-hidden ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <Text
              className={`text-center py-4 font-semibold ${
                isDarkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {language === "EN" ? "Message Options" : "Opsi Pesan"}
            </Text>

            {isOwn && !selectedMessage.is_recalled && (
              <>
                <TouchableOpacity
                  className={`px-4 py-3 border-t ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                  onPress={() => startEditMessage(selectedMessage)}
                >
                  <Text className="text-center text-red-500">
                    {language === "EN" ? "Edit" : "Edit"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`px-4 py-3 border-t ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                  onPress={() => {
                    closeMessageActions();
                    handleRecallMessage(selectedMessage);
                  }}
                >
                  <Text className="text-center text-red-500">
                    {language === "EN"
                      ? "Delete for Everyone"
                      : "Hapus untuk Semua"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              className={`px-4 py-3 border-t ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
              onPress={() => {
                closeMessageActions();
                handleDeleteForSelf(selectedMessage);
              }}
            >
              <Text className="text-center text-red-500">
                {language === "EN" ? "Delete for Me" : "Hapus untuk Saya"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-4 py-3 border-t ${
                isDarkMode ? "border-gray-700" : "border-gray-200"
              }`}
              onPress={closeMessageActions}
            >
              <Text
                className={`text-center ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {language === "EN" ? "Cancel" : "Batal"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    // KeyboardAvoidingView memastikan input tidak tertutup virtual keyboard.
    // behavior="padding" untuk iOS mendorong konten ke atas saat keyboard muncul.
    // behavior="height" untuk Android menyesuaikan tinggi kontainer.
    // keyboardVerticalOffset menggunakan tinggi header yang diukur secara dinamis.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? headerHeight + insets.top : 0
      }
    >
      {/* Header — onLayout mengukur tinggi aktual untuk offset keyboard */}
      <Header
        title={conversationTitle}
        subtitle={conversationSubtitle}
        isDarkMode={isDarkMode}
        onBack={onBack}
        onLayout={(e: LayoutChangeEvent) =>
          setHeaderHeight(e.nativeEvent.layout.height)
        }
        rightComponent={
          <TouchableOpacity
            onPress={() => {}}
            className={`p-2 rounded-2xl ${
              isDarkMode ? "bg-gray-700" : "bg-gray-200"
            }`}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={isDarkMode ? "#fff" : "#374151"}
            />
          </TouchableOpacity>
        }
      />

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className={`flex-1 px-6 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 20 }}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          const paddingToBottom = 50;
          const isBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
          setIsAtBottom(isBottom);
        }}
        scrollEventThrottle={100}
        // handled → tap pada pesan tidak dismiss keyboard secara tidak sengaja
        keyboardShouldPersistTaps="handled"
        // interactive → swipe ke bawah dismiss keyboard secara natural (iOS)
        keyboardDismissMode="interactive"
      >
        {loadingMessages ? (
          <ActivityIndicator size="large" color="#EF4444" className="mt-8" />
        ) : messages.length === 0 ? (
          <View className="items-center justify-center mt-8">
            <Text
              className={`text-base ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {language === "EN" ? "No messages yet" : "Belum ada pesan"}
            </Text>
            <Text
              className={`text-sm mt-2 ${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {language === "EN"
                ? "Send your first message below"
                : "Kirim pesan pertama Anda di bawah"}
            </Text>
          </View>
        ) : (
          // FIX #4: Gunakan MessageBubble (React.memo) sebagai pengganti
          // renderMessage() biasa agar tidak re-render saat state parent berubah.
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              isGroupChat={conversation.type === "group"}
              isDarkMode={isDarkMode}
              language={language}
              timezone={timezoneInfo.timezone}
              onLongPress={openMessageActions}
            />
          ))
        )}
      </ScrollView>

      {/* Edit bar atau ChatInput — keduanya berada di luar ScrollView
          sehingga selalu terlihat di atas keyboard */}
      {editingMessage ? (
        <ChatInput
          value={editText}
          onChangeText={setEditText}
          onSend={handleEditMessage}
          isDarkMode={isDarkMode}
          language={language}
          loading={loading}
          tabBarHeight={32}
          isEdit={true}
          onCancel={cancelEdit}
        />
      ) : (
        // ChatInput menerima insets.bottom untuk padding safe area
        // (home bar iPhone & navigation gesture bar Android)
        // tabBarHeight=32 untuk alignment dengan FloatingTabBar (bottom-8)
        <ChatInput
          ref={messageInputRef}
          value={messageText}
          onChangeText={(t) => {
            setMessageText(t);
            setIsUserTyping(true);
            // Biar UI kembali stabil: setelah user mengetik, pastikan input & layout
            // tidak membuat view melompat.
            setTimeout(() => {
              setIsAtBottom(true);
              scrollToBottom(false);
            }, 10); // Reduced from 50ms to 10ms for faster response
          }}
          onSend={handleSendMessage}
          isDarkMode={isDarkMode}
          language={language}
          loading={loading}
        />
      )}

      {renderMessageActionsModal()}
    </KeyboardAvoidingView>
  );
}

export default ViewChat;
