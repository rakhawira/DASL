/**
 * Date formatting utilities
 * Standardizes all date formats to DD MMM YYYY (e.g., 17 Jan 2026)
 */

/**
 * Helper: Parse date string to Date object with validation
 * @param dateString - Date string or Date object
 * @returns Date object or null if invalid
 */
const parseDate = (dateString: string | Date): Date | null => {
  if (!dateString) return null;
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Helper: Get user's local timezone
 * @returns User's local timezone string (e.g., 'Asia/Jakarta', 'America/New_York')
 */
const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Jakarta"; // Fallback to Jakarta if detection fails
  }
};

/**
 * Helper: Convert timezone abbreviation to IANA format
 * @param tz - Timezone string (e.g., 'WIB', 'WITA', 'WIT', 'Asia/Jakarta')
 * @returns IANA timezone string (e.g., 'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')
 */
export const convertToIANATimezone = (tz: string): string => {
  const tzLower = tz.toLowerCase();
  if (tzLower === "wib") return "Asia/Jakarta";
  if (tzLower === "wita") return "Asia/Makassar";
  if (tzLower === "wit") return "Asia/Jayapura";
  return tz; // Already IANA or unrecognized
};

/**
 * Helper: Convert IANA timezone to abbreviation
 * @param tz - Timezone string (e.g., 'Asia/Jakarta', 'WIB', 'WITA', 'WIT')
 * @returns Timezone abbreviation (e.g., 'WIB', 'WITA', 'WIT')
 */
export const convertToTimezoneAbbreviation = (tz: string): string => {
  const tzLower = tz.toLowerCase();
  if (tzLower === "wib" || tzLower === "asia/jakarta") return "WIB";
  if (tzLower === "wita" || tzLower === "asia/makassar") return "WITA";
  if (tzLower === "wit" || tzLower === "asia/jayapura") return "WIT";
  return tz; // Already abbreviation or unrecognized
};

/**
 * Helper: Format date in specified timezone
 * Backend sends time in GMT+7, we convert to specified timezone
 * @param date - Date object (already parsed from GMT+7)
 * @param options - Intl.DateTimeFormatOptions
 * @param timezone - Timezone string (e.g., 'Asia/Jakarta', 'WIB', 'WITA', 'WIT')
 * @returns Formatted string in specified timezone
 */
const formatInTimezone = (
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timezone?: string,
): string => {
  // Convert Indonesia timezone abbreviations to IANA timezone strings
  const getIANATimezone = (tz?: string): string => {
    if (!tz) return getUserTimezone();
    const tzLower = tz.toLowerCase();
    if (tzLower === "wib") return "Asia/Jakarta";
    if (tzLower === "wita") return "Asia/Makassar";
    if (tzLower === "wit") return "Asia/Jayapura";
    if (tz.includes("/")) return tz; // Already IANA
    return getUserTimezone();
  };

  return date.toLocaleString("id-ID", {
    ...options,
    timeZone: getIANATimezone(timezone),
  });
};

/**
 * Formats a date string or Date object to DD MMM YYYY format
 * Backend sends date in WIB format without timezone suffix
 * @param dateString - Date string or Date object
 * @param timezone - Optional timezone string (e.g., 'WIB', 'WITA', 'WIT', 'Asia/Jakarta')
 * @returns Formatted date string in DD MMM YYYY format
 */
export const formatDate = (
  dateString: string | Date,
  timezone?: string,
): string => {
  const date = parseDate(dateString);
  if (!date) return "-";

  return formatInTimezone(
    date,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
    timezone,
  );
};

/**
 * Formats a time string to HH:MM:SS format
 * Backend sends time in WIB format without timezone suffix
 * @param timeString - Time string or Date object
 * @param timezone - Optional timezone string (e.g., 'WIB', 'WITA', 'WIT', 'Asia/Jakarta')
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatTime = (
  timeString: string | Date,
  timezone?: string,
): string => {
  const date = parseDate(timeString);
  if (!date) return "-";

  return formatInTimezone(
    date,
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
    timezone,
  ).replace(/\./g, ":");
};

/**
 * Formats a datetime string to DD MMM YYYY, HH:MM:SS format
 * @param dateTimeString - DateTime string or Date object
 * @param timezone - Optional timezone string (e.g., 'WIB', 'WITA', 'WIT', 'Asia/Jakarta')
 * @returns Formatted datetime string
 */
export const formatDateTime = (
  dateTimeString: string | Date,
  timezone?: string,
): string => {
  const date = parseDate(dateTimeString);
  if (!date) return "-";
  return `${formatDate(date, timezone)}, ${formatTime(date, timezone)}`;
};

/**
 * Helper arrays for chat time formatting
 */
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/**
 * Helper: Parse date string with GMT+7 timezone suffix
 * @param dateString - Date string from backend (assumed GMT+7)
 * @returns Date object or null
 */
const parseGMT7Date = (dateString: string): Date | null => {
  const dateWithTimezone = dateString.includes("T")
    ? dateString.replace(/Z?$/, "+07:00")
    : `${dateString.replace(" ", "T")}+07:00`;
  const date = new Date(dateWithTimezone);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Helper: Get current time in GMT+7
 */
const getNowGMT7 = (): Date => {
  const now = new Date();
  const nowOffset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() + nowOffset + 7 * 60 * 60 * 1000);
};

/**
 * Helper: Format time to 12-hour with AM/PM
 */
const format12HourTime = (date: Date): string => {
  const hours24 = date.getHours();
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  return `${hours12}:${minutes} ${ampm}`;
};

/**
 * Formats a chat timestamp with relative time (Today, Yesterday, Weekday) and 12-hour format with AM/PM
 * Backend sends date in GMT+7 (Asia/Jakarta) format without timezone suffix
 * @param dateString - Date string from backend
 * @param language - Language code "EN" or "ID"
 * @param timezone - Optional timezone string (e.g., 'WIB', 'WITA', 'WIT', 'Asia/Jakarta')
 * @returns Formatted chat time string
 */
export const formatChatTime = (
  dateString: string | undefined,
  language: "EN" | "ID",
  timezone?: string,
): string => {
  if (!dateString) return "";

  const date = parseGMT7Date(dateString);
  if (!date) return "";

  const nowGMT7 = getNowGMT7();
  const diff = nowGMT7.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Convert timezone abbreviation to IANA format for time display
  const tzLower = timezone?.toLowerCase();
  let timeZone = "Asia/Jakarta"; // Default to WIB
  if (tzLower === "wita" || tzLower === "asia/makassar") {
    timeZone = "Asia/Makassar";
  } else if (tzLower === "wit" || tzLower === "asia/jayapura") {
    timeZone = "Asia/Jayapura";
  } else if (timezone && timezone.includes("/")) {
    timeZone = timezone; // Already IANA
  }

  // Format time in the specified timezone
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timeZone,
  });

  if (days === 0) {
    return timeStr;
  } else if (days === 1) {
    return language === "EN" ? `Yesterday, ${timeStr}` : `Kemarin, ${timeStr}`;
  } else if (days < 7) {
    const weekdays = language === "EN" ? WEEKDAYS_EN : WEEKDAYS_ID;
    return `${weekdays[date.getDay()]}, ${timeStr}`;
  } else {
    const months = language === "EN" ? MONTHS_EN : MONTHS_ID;
    return `${date.getDate()} ${months[date.getMonth()]}, ${timeStr}`;
  }
};
