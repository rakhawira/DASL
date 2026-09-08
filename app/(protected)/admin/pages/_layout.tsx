import { Stack } from "expo-router";

export default function AdminPagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddCoursePage" />
      <Stack.Screen name="AddNewsPage" />
      <Stack.Screen name="AddSSKMPage" />
      <Stack.Screen name="AddUserPage" />
      <Stack.Screen name="CalendarPage" />
      <Stack.Screen name="EditCoursePage" />
      <Stack.Screen name="EditDevicesPage" />
      <Stack.Screen name="EditNewsPage" />
      <Stack.Screen name="EditMaxPointsPage" />
      <Stack.Screen name="EditSSKMPage" />
      <Stack.Screen name="EditUserPage" />
      <Stack.Screen name="ManageApprovalPage" />
      <Stack.Screen name="ManageCoursePage" />
      <Stack.Screen name="ManageDevicesPage" />
      <Stack.Screen name="ManageNewsPage" />
      <Stack.Screen name="ManageSSKMPage" />
      <Stack.Screen name="PerwalianPage" />
      <Stack.Screen name="QRScannerPage" />
      <Stack.Screen name="StudentDetailsPage" />
      <Stack.Screen name="ViewLogsPage" />
      <Stack.Screen name="ViewChatPage" />
      <Stack.Screen name="NewChatPage" />
    </Stack>
  );
}
