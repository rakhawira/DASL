import { NewsCategory } from "@/types/news";

export const NEWS_CATEGORIES: NewsCategory[] = [
  { value: "event", label: { EN: "Event", ID: "Acara" } },
  {
    value: "herregistrasi_perwalian",
    label: {
      EN: "Re-registration & Academic Advising",
      ID: "Herregistrasi & perwalian",
    },
  },
  {
    value: "perubahan_krs",
    label: { EN: "Course Schedule Changes", ID: "Perubahan KRS" },
  },
  {
    value: "pembatalan_krs",
    label: { EN: "Course Cancellation", ID: "Pembatalan KRS" },
  },
  {
    value: "data_krs_tetap",
    label: { EN: "Fixed Course Data", ID: "Data KRS Tetap" },
  },
  {
    value: "batas_pengajuan_cuti",
    label: { EN: "Leave Application Deadline", ID: "Batas Pengajuan Cuti" },
  },
  {
    value: "pelaksanaan_praktikum",
    label: { EN: "Practicum Implementation", ID: "Pelaksanaan Praktikum" },
  },
  {
    value: "pengumuman_nilai",
    label: { EN: "Grade Announcement", ID: "Pengumuman Nilai" },
  },
  {
    value: "pengumuman_presensi",
    label: { EN: "Attendance Announcement", ID: "Pengumuman Presensi" },
  },
  {
    value: "ujian_praktikum",
    label: { EN: "Practicum Exam", ID: "Ujian Praktikum" },
  },
  { value: "uts_uas", label: { EN: "Midterm/Final Exam", ID: "UTS/UAS" } },
  {
    value: "pengumuman_yudisium",
    label: { EN: "Yudisium Announcement", ID: "Pengumuman Yudisium" },
  },
  { value: "hari_tenang", label: { EN: "Quiet Day", ID: "Hari Tenang" } },
  {
    value: "hari_libur_semester",
    label: { EN: "Semester Holiday", ID: "Hari Libur Semester" },
  },
  {
    value: "hari_libur_nasional",
    label: { EN: "National Holiday", ID: "Hari Libur Nasional" },
  },
  {
    value: "daftar_sidang_ta_akhir",
    label: { EN: "Final Thesis Defense List", ID: "Daftar Sidang TA Akhir" },
  },
  { value: "dies_natalis", label: { EN: "Dies Natalis", ID: "Dies Natalis" } },
  { value: "wisuda", label: { EN: "Graduation", ID: "Wisuda" } },
  { value: "hari_upacara", label: { EN: "Ceremony Day", ID: "Hari Upacara" } },
  {
    value: "kelengkapan_yudisium_akhir",
    label: {
      EN: "Final Yudisium Requirements",
      ID: "Kelengkapan Yudisium Akhir",
    },
  },
];

export const NEWS_CATEGORIES_WITH_ALL = [
  { value: "", label: { EN: "All Categories", ID: "Semua Kategori" } },
  ...NEWS_CATEGORIES,
];

export const generateYears = (length: number = 10) => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length }, (_, i) => ({
    value: (currentYear + i).toString(),
    label: (currentYear + i).toString(),
  }));
};

export const MONTHS = [
  { value: "01", label: { EN: "January", ID: "Januari" } },
  { value: "02", label: { EN: "February", ID: "Februari" } },
  { value: "03", label: { EN: "March", ID: "Maret" } },
  { value: "04", label: { EN: "April", ID: "April" } },
  { value: "05", label: { EN: "May", ID: "Mei" } },
  { value: "06", label: { EN: "June", ID: "Juni" } },
  { value: "07", label: { EN: "July", ID: "Juli" } },
  { value: "08", label: { EN: "August", ID: "Agustus" } },
  { value: "09", label: { EN: "September", ID: "September" } },
  { value: "10", label: { EN: "October", ID: "Oktober" } },
  { value: "11", label: { EN: "November", ID: "November" } },
  { value: "12", label: { EN: "December", ID: "Desember" } },
];

export const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: (i + 1).toString().padStart(2, "0"),
  label: (i + 1).toString(),
}));

export const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: i.toString().padStart(2, "0"),
}));

export const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString().padStart(2, "0"),
  label: i.toString().padStart(2, "0"),
}));
