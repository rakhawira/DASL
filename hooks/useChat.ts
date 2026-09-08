import { useCallback, useEffect, useState } from "react";
import { ChatAPI } from "../services/api";
import { websocketService } from "../services/websocketService";
import { ChatMessage, ChatUser, Conversation } from "../types/chat";

export const useChatConversations = (userId: number | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await ChatAPI.getConversations(userId);
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  // Setup WebSocket handler for realtime conversation updates
  useEffect(() => {
    if (!userId) return;

    console.log(`[useChatConversations] Setting up WebSocket handler for user ${userId}`);

    const unsubConversationUpdated = websocketService.onMessage(
      "conversation_updated",
      (message: any) => {
        console.log(`[useChatConversations] Received conversation_updated:`, message);
        // Refresh conversations when any conversation is updated
        fetchConversations();
      },
    );

    return () => {
      console.log(`[useChatConversations] Cleaning up WebSocket handler for user ${userId}`);
      unsubConversationUpdated?.();
    };
  }, [userId, fetchConversations]);

  useEffect(() => {
    fetchConversations();
    // Reduced polling interval from 10s to 5s for faster conversation list updates
    // WebSocket handles realtime updates, this is just a fallback
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    setConversations,
    refreshing,
    onRefresh,
    fetchConversations,
  };
};

export const useChatMessages = (
  conversationId: number | undefined,
  userId: number | undefined,
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoadingMessages(true);
      const response = await ChatAPI.getMessages(conversationId);
      if (response.success) {
        setMessages(response.data);
        if (userId) {
          await ChatAPI.markAsRead({
            conversation_id: conversationId,
            user_id: userId,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId, userId]);

  // Setup WebSocket handlers for realtime message updates
  useEffect(() => {
    if (!conversationId || !userId) return;

    console.log(`[useChat] Setting up WebSocket handlers for conversation ${conversationId}`);

    // Karena websocketService mendukung multiple subscribers per type,
    // kita simpan unsubscribe function agar cleanup hanya menghapus handler milik hook ini.
    const unsubNew = websocketService.onMessage(
      "new_message",
      (message: any) => {
        console.log(`[useChat] Received new_message:`, message);
        if (message.data?.conversation_id === conversationId) {
          console.log(`[useChat] Adding new message to state for conversation ${conversationId}`);
          setMessages((prev) => [...prev, message.data]);
          // Mark as read when receiving new message
          ChatAPI.markAsRead({
            conversation_id: conversationId,
            user_id: userId,
          }).catch((error) => {
            console.error("[useChat] Error marking as read:", error);
          });
        }
      },
    );

    const unsubEdited = websocketService.onMessage(
      "message_edited",
      (message: any) => {
        console.log(`[useChat] Received message_edited:`, message);
        if (message.data?.conversation_id === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.data.id
                ? { ...msg, message: message.data.message, is_edited: true }
                : msg,
            ),
          );
        }
      },
    );

    const unsubRecalled = websocketService.onMessage(
      "message_recalled",
      (message: any) => {
        console.log(`[useChat] Received message_recalled:`, message);
        if (message.data?.conversation_id === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.data.id
                ? {
                    ...msg,
                    is_recalled: true,
                    message: "Pesan telah ditarik",
                  }
                : msg,
            ),
          );
        }
      },
    );

    const unsubDeleted = websocketService.onMessage(
      "message_deleted",
      (message: any) => {
        console.log(`[useChat] Received message_deleted:`, message);
        if (
          message.data?.conversation_id === conversationId &&
          message.data?.user_id === userId
        ) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== message.data.id),
          );
        }
      },
    );

    const unsubConversationUpdated = websocketService.onMessage(
      "conversation_updated",
      (message: any) => {
        console.log(`[useChat] Received conversation_updated:`, message);
        if (message.data?.id === conversationId) {
          // Refresh messages when conversation is updated
          fetchMessages();
        }
      },
    );

    return () => {
      console.log(`[useChat] Cleaning up WebSocket handlers for conversation ${conversationId}`);
      unsubNew?.();
      unsubEdited?.();
      unsubRecalled?.();
      unsubDeleted?.();
      unsubConversationUpdated?.();
    };
  }, [conversationId, userId, fetchMessages]);

  const pollNewMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await ChatAPI.getMessages(conversationId);
      if (response.success && response.data) {
        const newMessages = response.data;
        setMessages((prevMessages) => {
          if (newMessages.length > prevMessages.length) {
            return newMessages;
          }
          if (newMessages.length === prevMessages.length) {
            const hasChanges = newMessages.some(
              (newMsg: ChatMessage, idx: number) => {
                const oldMsg = prevMessages[idx];
                return (
                  oldMsg?.message !== newMsg.message ||
                  oldMsg?.is_deleted !== newMsg.is_deleted
                );
              },
            );
            if (hasChanges) return newMessages;
          }
          return prevMessages;
        });
      }
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !conversationId || !userId) return null;

      try {
        const response = await ChatAPI.sendMessage({
          conversation_id: conversationId,
          sender_id: userId,
          message: messageText.trim(),
        });

        if (response.success) {
          setMessages((prev) => [...prev, response.data]);
          return response.data;
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
      return null;
    },
    [conversationId, userId],
  );

  const editMessage = useCallback(
    async (messageId: number, newMessage: string) => {
      if (!newMessage.trim() || !userId) return null;

      try {
        const response = await ChatAPI.editMessage(
          messageId,
          userId,
          newMessage.trim(),
        );

        if (response.success) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, message: newMessage.trim(), is_edited: true }
                : msg,
            ),
          );
          return response.data;
        }
      } catch (error) {
        console.error("Error editing message:", error);
      }
      return null;
    },
    [userId],
  );

  const recallMessage = useCallback(
    async (messageId: number) => {
      if (!userId) return null;

      try {
        const response = await ChatAPI.recallMessage(messageId, userId);

        if (response.success) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, is_recalled: true, message: "Pesan telah ditarik" }
                : msg,
            ),
          );
          return response.data;
        }
      } catch (error) {
        console.error("Error recalling message:", error);
      }
      return null;
    },
    [userId],
  );

  const deleteMessageForSelf = useCallback(
    async (messageId: number) => {
      if (!userId) return null;

      try {
        const response = await ChatAPI.deleteMessage(messageId, userId);

        if (response.success) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
          return response.data;
        }
      } catch (error) {
        console.error("Error deleting message:", error);
      }
      return null;
    },
    [userId],
  );

  return {
    messages,
    setMessages,
    loadingMessages,
    fetchMessages,
    pollNewMessages,
    sendMessage,
    editMessage,
    recallMessage,
    deleteMessageForSelf,
  };
};

export const useAvailableUsers = (userId: number | undefined) => {
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAvailableUsers = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingUsers(true);
      const response = await ChatAPI.getAvailableUsers(userId);
      if (response.success) {
        setAvailableUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [userId]);

  const createConversation = useCallback(
    async (selectedUser: ChatUser, currentUserId: number) => {
      try {
        const response = await ChatAPI.createConversation({
          type: "direct",
          created_by: currentUserId,
          participant_ids: [selectedUser.id],
        });
        return response.success ? response.data : null;
      } catch (error) {
        console.error("Error creating conversation:", error);
        return null;
      }
    },
    [],
  );

  const createGroupConversation = useCallback(
    async (title: string, participantIds: number[], currentUserId: number) => {
      try {
        const response = await ChatAPI.createConversation({
          type: "group",
          title,
          created_by: currentUserId,
          participant_ids: participantIds,
        });
        return response.success ? response.data : null;
      } catch (error) {
        console.error("Error creating group conversation:", error);
        return null;
      }
    },
    [],
  );

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return {
    availableUsers,
    loadingUsers,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    fetchAvailableUsers,
    createConversation,
    createGroupConversation,
  };
};
