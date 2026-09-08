import { LanguageProvider } from "@/contexts/LanguageContext";
import { RefreshProvider } from "@/contexts/RefreshContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Stack } from "expo-router";
import "../global.css";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <RefreshProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(public)/onboarding" />
              <Stack.Screen name="(public)/(auth)" />
              <Stack.Screen name="(protected)/user" />
              <Stack.Screen name="(protected)/admin" />
              <Stack.Screen name="(protected)/lecturer" />
            </Stack>
          </RefreshProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
