import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { Conversation } from "@/types/chat";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ChatList } from "../../(shared)/ChatShared";

export default function UserChatTab() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Memoize callbacks to prevent unnecessary re-renders
  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      router.push({
        pathname: "/user/pages/ViewChatPage",
        params: { id: conversation.id.toString() },
      });
    },
    [router],
  );

  const handleNewChat = useCallback(() => {
    router.push("/user/pages/NewChatPage");
  }, [router]);

  // Memoize props to prevent unnecessary re-renders of ChatList
  const props = useMemo(
    () => ({
      user,
      isDarkMode,
      language,
      showToast,
      onSelectConversation: handleSelectConversation,
      onNewChat: handleNewChat,
    }),
    [
      user,
      isDarkMode,
      language,
      showToast,
      handleSelectConversation,
      handleNewChat,
    ],
  );

  return <ChatList {...props} />;
}
