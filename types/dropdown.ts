export interface DropdownOption {
  value: string;
  label: string | { EN: string; ID: string };
}

export interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  placeholderEN?: string;
  placeholderID?: string;
  isDarkMode: boolean;
  language: "EN" | "ID";
  className?: string;
  disabled?: boolean;
}

// Time picker specific types
export interface TimePickerProps {
  selectedHour: string;
  selectedMinute: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
  isDarkMode: boolean;
  language: "EN" | "ID";
  labelEN?: string;
  labelID?: string;
}

// Dropdown data constants
export const HARI_OPTIONS: DropdownOption[] = [
  { value: "Senin", label: { EN: "Monday", ID: "Senin" } },
  { value: "Selasa", label: { EN: "Tuesday", ID: "Selasa" } },
  { value: "Rabu", label: { EN: "Wednesday", ID: "Rabu" } },
  { value: "Kamis", label: { EN: "Thursday", ID: "Kamis" } },
  { value: "Jumat", label: { EN: "Friday", ID: "Jumat" } },
  { value: "Sabtu", label: { EN: "Saturday", ID: "Sabtu" } },
  { value: "Minggu", label: { EN: "Sunday", ID: "Minggu" } },
];

export const generateHourOptions = (): DropdownOption[] => {
  return Array.from({ length: 24 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });
};

export const generateMinuteOptions = (): DropdownOption[] => {
  return Array.from({ length: 60 }, (_, i) => {
    const value = i.toString().padStart(2, "0");
    return { value, label: value };
  });
};

export const SKS_OPTIONS: DropdownOption[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
];

export const SEMESTER_OPTIONS: DropdownOption[] = [
  { value: "ganjil", label: { EN: "Odd", ID: "Ganjil" } },
  { value: "genap", label: { EN: "Even", ID: "Genap" } },
];
