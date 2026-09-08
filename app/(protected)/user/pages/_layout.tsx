import { Stack } from "expo-router";

export default function UserPagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarPage" />
      <Stack.Screen name="QRScannerPage" />
      <Stack.Screen name="PerwalianPage" />
      <Stack.Screen name="ViewLogsPage" />
      <Stack.Screen name="ViewChatPage" />
      <Stack.Screen name="NewChatPage" />
    </Stack>
  );
}
