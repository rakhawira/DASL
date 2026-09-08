import {
  ChatParticipant,
  Conversation,
  DraftConversation,
} from "../types/chat";

// Type guard to check if conversation is a draft
const isDraftConversation = (
  conv: Conversation | DraftConversation,
): conv is DraftConversation => {
  return conv.id === null;
};

export const getConversationTitle = (
  conversation: Conversation | DraftConversation,
  currentUserId: number | undefined,
  language: "EN" | "ID",
  participants?: ChatParticipant[],
) => {
  // Handle draft conversation
  if (isDraftConversation(conversation)) {
    // Draft conversation
    if (conversation.type === "direct" && conversation.draftParticipant) {
      return conversation.draftParticipant.name;
    }
    if (conversation.type === "group" && conversation.draftTitle) {
      return conversation.draftTitle;
    }
    if (conversation.type === "group") {
      return language === "EN" ? "New Group" : "Grup Baru";
    }
    return language === "EN" ? "New Chat" : "Chat Baru";
  }

  // From here, TypeScript knows this is a Conversation (not DraftConversation)
  const conv = conversation as Conversation;

  // For group, always use title if available
  if (conv.type === "group" && conv.title) {
    return conv.title;
  }

  // For direct chat
  if (conv.type === "direct") {
    if (conv.other_participant_name) {
      return conv.other_participant_name;
    }
    // Derive from participants
    if (participants && participants.length > 0) {
      const otherParticipant = participants.find(
        (p) => p.user_id !== currentUserId,
      );
      if (otherParticipant?.name) {
        return otherParticipant.name;
      }
    }
  }

  // Fallback for group without title
  if (conv.type === "group" && participants) {
    return language === "EN" ? "Group" : "Grup";
  }

  if (conv.creator_name && conv.created_by !== currentUserId) {
    return conv.creator_name;
  }

  return language === "EN" ? "Unknown" : "Tidak diketahui";
};

export const getParticipantNamesSubtitle = (
  participants: ChatParticipant[],
  currentUserId: number | undefined,
  language: "EN" | "ID",
): string | undefined => {
  if (participants.length === 0) return undefined;

  const otherParticipants = currentUserId
    ? participants.filter((p) => p.user_id !== currentUserId)
    : participants;

  if (otherParticipants.length === 0) return undefined;

  const names = otherParticipants.map((p) => p.name || p.username || "");

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return language === "EN"
      ? `${names[0]}, ${names[1]}`
      : `${names[0]}, ${names[1]}`;
  }

  // 3 or more
  const remainingCount = names.length - 2;
  return language === "EN"
    ? `${names[0]}, ${names[1]} +${remainingCount}`
    : `${names[0]}, ${names[1]} +${remainingCount}`;
};
