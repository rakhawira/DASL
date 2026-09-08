import { Stack } from "expo-router";

export default function LecturerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="pages" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
