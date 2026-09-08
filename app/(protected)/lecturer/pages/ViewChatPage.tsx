import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/hooks/useAuth";
import { ChatAPI } from "@/services/api";
import { Conversation, DraftConversation } from "@/types/chat";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView as SafeAreaViewComponent } from "react-native-safe-area-context";
import { ViewChat } from "../../(shared)/ViewChatShared";

export default function ViewChatPage() {
  const router = useRouter();
  const { id, draft } = useLocalSearchParams<{ id: string; draft: string }>();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [conversation, setConversation] = useState<
    Conversation | DraftConversation | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversation = async () => {
      // Handle draft conversation (new chat that hasn't been saved to backend yet)
      if (draft) {
        try {
          const draftConversation: DraftConversation = JSON.parse(
            decodeURIComponent(draft),
          );
          setConversation(draftConversation);
        } catch (error) {
          console.error("Error parsing draft conversation:", error);
          showToast("Error loading chat", "error");
        } finally {
          setLoading(false);
        }
        return;
      }

      // Handle existing conversation
      if (!user?.id || !id) {
        setLoading(false);
        return;
      }

      try {
        const response = await ChatAPI.getConversations(user.id);
        if (response.success) {
          const found = response.data.find(
            (c: Conversation) => c.id === parseInt(id, 10),
          );
          if (found) {
            setConversation(found);
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();
  }, [user?.id, id, draft, showToast]);

  const handleBack = () => {
    router.back();
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversation(updatedConversation);
  };

  const handleConversationCreated = (createdConversation: Conversation) => {
    setConversation(createdConversation);
  };

  // If no id and no draft, nothing to show
  if (!id && !draft) return null;

  // Placeholder for loading state
  const placeholderConversation: Conversation | DraftConversation =
    conversation || {
      id: null,
      type: "direct",
      created_by: user?.id || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };

  return (
    <SafeAreaViewComponent
      className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}
      edges={["top", "left", "right", "bottom"]}
    >
      <ViewChat
        user={user}
        isDarkMode={isDarkMode}
        language={language}
        showToast={showToast}
        conversation={conversation || placeholderConversation}
        onBack={handleBack}
        onConversationUpdate={handleConversationUpdate}
        onConversationCreated={handleConversationCreated}
      />
    </SafeAreaViewComponent>
  );
}
