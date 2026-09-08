import { Stack } from "expo-router";

export default function LecturerPagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EditSchedulePage" />
      <Stack.Screen name="CalendarPage" />
      <Stack.Screen name="QRScannerPage" />
      <Stack.Screen name="ViewLogsPage" />
      <Stack.Screen name="ViewChatPage" />
      <Stack.Screen name="NewChatPage" />
    </Stack>
  );
}
