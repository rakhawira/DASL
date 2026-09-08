import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { useChatConversations } from "@/hooks/useChat";
import { DraftConversation } from "@/types/chat";
import { useRouter } from "expo-router";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";
import { NewChat } from "../../(shared)/NewChatShared";

export default function NewChatPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { conversations } = useChatConversations(user?.id);

  const handleBack = () => {
    router.back();
  };

  const handleConversationCreated = (conversation: { id: number }) => {
    router.push({
      pathname: "/admin/pages/ViewChatPage",
      params: { id: conversation.id.toString() },
    });
  };

  const handleDraftConversation = (draftConversation: DraftConversation) => {
    router.push({
      pathname: "/admin/pages/ViewChatPage",
      params: {
        draft: encodeURIComponent(JSON.stringify(draftConversation)),
      },
    });
  };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <NewChat
        user={user}
        isDarkMode={isDarkMode}
        language={language}
        showToast={showToast}
        onBack={handleBack}
        onConversationCreated={handleConversationCreated}
        onDraftConversation={handleDraftConversation}
        conversations={conversations}
      />
    </SafeAreaViewComponent>
  );
}
