export type ConversationType = "direct" | "group";
export type MessageType = "text" | "image" | "file";

export interface Conversation {
  id: number;
  title: string | null;
  type: ConversationType;
  created_by: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  creator_username?: string;
  other_participant_name?: string;
  participant_count?: number;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_name?: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  message_type: MessageType;
  file_url?: string;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  is_recalled: boolean;
  recalled_at?: string;
  created_at: string;
  sender_name?: string;
  sender_username?: string;
  sender_role?: string;
}

export interface ChatParticipant {
  id: number;
  user_id: number;
  conversation_id: number;
  joined_at: string;
  last_read_at: string;
  is_admin: boolean;
  name?: string;
  username?: string;
  role?: string;
  avatar?: string;
}

export interface CreateConversationRequest {
  title?: string;
  type: ConversationType;
  created_by: number;
  participant_ids: number[];
}

export interface SendMessageRequest {
  conversation_id: number;
  sender_id: number;
  message: string;
  message_type?: MessageType;
  file_url?: string;
}

export interface MarkAsReadRequest {
  conversation_id: number;
  user_id: number;
}

export interface DeleteMessageRequest {
  user_id: number;
}

export interface AddParticipantRequest {
  user_id: number;
}

export interface ChatUser {
  id: number;
  username: string;
  name: string;
  role: string;
  jurusan?: string;
  fakultas?: string;
  avatar?: string;
}

export interface ChatPagination {
  page: number;
  limit: number;
  total: number;
}

export interface ChatResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedChatResponse<T> extends ChatResponse<T> {
  pagination: ChatPagination;
}

// ==================== SHARED PROPS ====================

export interface ChatSharedProps {
  user: { id: number; name: string; username: string; role: string } | null;
  isDarkMode: boolean;
  language: "EN" | "ID";
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export interface ChatListProps extends ChatSharedProps {
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
}

export interface ViewChatProps extends ChatSharedProps {
  conversation: Conversation | DraftConversation;
  onBack: () => void;
  onConversationUpdate?: (updatedConversation: Conversation) => void;
  // Callback when draft becomes real conversation (first message sent)
  onConversationCreated?: (conversation: Conversation) => void;
}

export interface NewChatProps extends ChatSharedProps {
  onBack: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  onDraftConversation?: (draftConversation: DraftConversation) => void;
  conversations?: Conversation[];
}

// ==================== DRAFT CONVERSATION ====================
// Used for new conversations before the first message is sent
export interface DraftConversation {
  id: null; // null indicates draft (not saved to backend yet)
  type: ConversationType;
  created_by: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // For direct chat
  draftParticipant?: ChatUser;
  // For group chat
  draftParticipants?: ChatUser[];
  draftTitle?: string;
}
