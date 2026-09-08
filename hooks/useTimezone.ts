import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

interface TimezoneInfo {
  timezone: string;
  offset: string;
  region: string;
  isIndonesia: boolean;
}

export function useTimezone() {
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo>({
    timezone: "UTC",
    offset: "+00:00",
    region: "International",
    isIndonesia: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  useEffect(() => {
    setupLocationWatcher();

    return () => {
      // Cleanup location subscription on unmount
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const setupLocationWatcher = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if location services are enabled (with error handling)
      let isEnabled = false;
      try {
        isEnabled = await Location.hasServicesEnabledAsync();
      } catch (serviceErr) {
        console.warn("Could not check location services status:", serviceErr);
        // Assume services might be disabled if we can't check
        isEnabled = false;
      }

      if (!isEnabled) {
        console.warn("Location services are disabled");
        setError("Location services disabled");

        // Fallback to device timezone
        const deviceTimezone = getDeviceTimezone();
        setTimezoneInfo(deviceTimezone);
        setLoading(false);
        return;
      }

      // Request location permission
      let permissionStatus;
      try {
        permissionStatus = await Location.requestForegroundPermissionsAsync();
      } catch (permErr) {
        console.warn("Could not request location permission:", permErr);
        setError("Location permission error");

        // Fallback to device timezone
        const deviceTimezone = getDeviceTimezone();
        setTimezoneInfo(deviceTimezone);
        setLoading(false);
        return;
      }

      if (permissionStatus.status !== "granted") {
        // If permission denied, use device timezone
        const deviceTimezone = getDeviceTimezone();
        setTimezoneInfo(deviceTimezone);
        setLoading(false);
        return;
      }

      // Get initial location
      let initialLocation;
      try {
        initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (locErr) {
        console.warn("Could not get current location:", locErr);
        setError("Location unavailable");

        // Fallback to device timezone
        const deviceTimezone = getDeviceTimezone();
        setTimezoneInfo(deviceTimezone);
        setLoading(false);
        return;
      }

      const { latitude, longitude } = initialLocation.coords;
      const calculatedTimezone = calculateTimezoneFromCoords(
        latitude,
        longitude,
      );
      setTimezoneInfo(calculatedTimezone);
      setLoading(false);

      // Watch for location changes
      try {
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 1000, // Update every 1km
            timeInterval: 60000, // Update every minute
          },
          (newLocation) => {
            const { latitude: newLat, longitude: newLon } = newLocation.coords;
            const newTimezone = calculateTimezoneFromCoords(newLat, newLon);

            // Only update if timezone actually changed
            if (
              newTimezone.timezone !== timezoneInfo.timezone ||
              newTimezone.offset !== timezoneInfo.offset
            ) {
              setTimezoneInfo(newTimezone);
            }
          },
        );
      } catch (watchErr) {
        console.warn("Could not set up location watcher:", watchErr);
        // Still use the initial location we got, just won't auto-update
        setError("Auto-update disabled");
      }
    } catch (err) {
      console.error("Unexpected error in setupLocationWatcher:", err);
      setError("Unexpected error");

      // Fallback to device timezone
      const deviceTimezone = getDeviceTimezone();
      setTimezoneInfo(deviceTimezone);
      setLoading(false);
    }
  };

  const fetchTimezone = async () => {
    // Stop existing subscription
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // Restart location watcher
    await setupLocationWatcher();
  };

  const getDeviceTimezone = (): TimezoneInfo => {
    const offset = getTimezoneOffset();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert IANA timezone to Indonesian abbreviation if applicable
    let convertedTimezone = timezone || "UTC";
    let isIndonesia = false;
    let region = "Device Default";

    if (timezone === "Asia/Jakarta") {
      convertedTimezone = "WIB";
      isIndonesia = true;
      region = "Western Indonesia (WIB)";
    } else if (timezone === "Asia/Makassar") {
      convertedTimezone = "WITA";
      isIndonesia = true;
      region = "Central Indonesia (WITA)";
    } else if (timezone === "Asia/Jayapura") {
      convertedTimezone = "WIT";
      isIndonesia = true;
      region = "Eastern Indonesia (WIT)";
    } else {
      // For Indonesian users with unrecognized timezone, default to WIB based on offset
      // WIB is UTC+7, WITA is UTC+8, WIT is UTC+9
      if (offset === "+07:00") {
        convertedTimezone = "WIB";
        isIndonesia = true;
        region = "Western Indonesia (WIB)";
      } else if (offset === "+08:00") {
        convertedTimezone = "WITA";
        isIndonesia = true;
        region = "Central Indonesia (WITA)";
      } else if (offset === "+09:00") {
        convertedTimezone = "WIT";
        isIndonesia = true;
        region = "Eastern Indonesia (WIT)";
      }
    }

    return {
      timezone: convertedTimezone,
      offset: offset,
      region: region,
      isIndonesia: isIndonesia,
    };
  };

  const getTimezoneOffset = (): string => {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? "+" : "-";
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const calculateTimezoneFromCoords = (
    lat: number,
    lon: number,
  ): TimezoneInfo => {
    // Indonesia timezone boundaries based on longitude
    // WIB (Western Indonesia Time): UTC+7 - Longitude 95°E to 120°E
    // WITA (Central Indonesia Time): UTC+8 - Longitude 120°E to 135°E
    // WIT (Eastern Indonesia Time): UTC+9 - Longitude 135°E to 141°E

    // Check if location is in Indonesia
    const indonesiaLatMin = -11;
    const indonesiaLatMax = 6;
    const indonesiaLonMin = 95;
    const indonesiaLonMax = 141;

    const isIndonesia =
      lat >= indonesiaLatMin &&
      lat <= indonesiaLatMax &&
      lon >= indonesiaLonMin &&
      lon <= indonesiaLonMax;

    if (isIndonesia) {
      if (lon < 120) {
        return {
          timezone: "WIB",
          offset: "+07:00",
          region: "Western Indonesia (WIB)",
          isIndonesia: true,
        };
      } else if (lon < 135) {
        return {
          timezone: "WITA",
          offset: "+08:00",
          region: "Central Indonesia (WITA)",
          isIndonesia: true,
        };
      } else {
        return {
          timezone: "WIT",
          offset: "+09:00",
          region: "Eastern Indonesia (WIT)",
          isIndonesia: true,
        };
      }
    }

    // For international locations, calculate offset from longitude
    const offsetHours = Math.round(lon / 15);
    const offsetSign = offsetHours >= 0 ? "+" : "-";
    const absOffsetHours = Math.abs(offsetHours);

    // Get device timezone and convert to Indonesian abbreviation if applicable
    const deviceTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    let convertedTimezone = deviceTimezone;
    let isIndonesianTimezone = false;
    let region = "International";

    if (deviceTimezone === "Asia/Jakarta") {
      convertedTimezone = "WIB";
      isIndonesianTimezone = true;
      region = "Western Indonesia (WIB)";
    } else if (deviceTimezone === "Asia/Makassar") {
      convertedTimezone = "WITA";
      isIndonesianTimezone = true;
      region = "Central Indonesia (WITA)";
    } else if (deviceTimezone === "Asia/Jayapura") {
      convertedTimezone = "WIT";
      isIndonesianTimezone = true;
      region = "Eastern Indonesia (WIT)";
    }

    return {
      timezone: convertedTimezone,
      offset: `${offsetSign}${String(absOffsetHours).padStart(2, "0")}:00`,
      region: region,
      isIndonesia: isIndonesianTimezone,
    };
  };

  return {
    timezoneInfo,
    loading,
    error,
    refetch: fetchTimezone,
  };
}
