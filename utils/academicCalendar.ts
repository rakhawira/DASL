export interface AcademicDay {
  tanggal: number;
  hari: string;
  event: string[];
}

export interface AcademicMonthData {
  days: AcademicDay[];
}

export interface EventStyle {
  type: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  pattern?: string;
}

export const monthNames: { [key: string]: string } = {
  januari: "Januari",
  februari: "Februari",
  maret: "Maret",
  april: "April",
  mei: "Mei",
  juni: "Juni",
  juli: "Juli",
  agustus: "Agustus",
  september: "September",
  oktober: "Oktober",
  november: "November",
  desember: "Desember",
};

export function getAcademicEventsForMonth(monthKey: string): AcademicDay[] {
  return [];
}

export function getAcademicEventsForDate(
  monthKey: string,
  date: number
): string[] {
  return [];
}

export function getEventStyle(eventName: string): EventStyle | null {
  return null;
}

export function getAllEventCodes(): Record<string, EventStyle> {
  return {};
}

export function getMonthKeyFromIndex(monthIndex: number): string {
  const keys = [
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
  ];
  return keys[monthIndex] || "januari";
}
