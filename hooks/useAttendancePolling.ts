import { useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";

/**
 * Custom hook to control polling based on screen focus
n * Used by AttendanceTab components to enable/disable polling and WebSocket
 */
export function useAttendancePolling() {
  const [isPollingEnabled, setIsPollingEnabled] = useState(true);

  // Enable polling when screen is focused, disable when unfocused
  useFocusEffect(
    useCallback(() => {
      setIsPollingEnabled(true);
      return () => {
        setIsPollingEnabled(false);
      };
    }, [])
  );

  return isPollingEnabled;
}
