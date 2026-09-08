import { UserRole } from "@/types/user";

export interface SelectOption {
  value: string;
  label: {
    EN: string;
    ID: string;
  };
}

export const ROLES: { value: UserRole; label: { EN: string; ID: string } }[] = [
  { value: "mahasiswa", label: { EN: "Student", ID: "Mahasiswa" } },
  { value: "dosen", label: { EN: "Lecturer", ID: "Dosen" } },
  { value: "staff", label: { EN: "Staff", ID: "Staff" } },
  { value: "admin", label: { EN: "Administrator", ID: "Administrator" } },
];

export const FACULTIES: SelectOption[] = [
  {
    value: "Fakultas Teknologi dan Informatika",
    label: {
      EN: "Faculty of Technology and Informatics",
      ID: "Fakultas Teknologi dan Informatika",
    },
  },
  {
    value: "Fakultas Desain dan Industri Kreatif",
    label: {
      EN: "Faculty of Design and Creative Industries",
      ID: "Fakultas Desain dan Industri Kreatif",
    },
  },
  {
    value: "Fakultas Ekonomi dan Bisnis",
    label: {
      EN: "Faculty of Economics and Business",
      ID: "Fakultas Ekonomi dan Bisnis",
    },
  },
];

export const DOSEN_TYPES: SelectOption[] = [
  {
    value: "pengajar",
    label: {
      EN: "Teaching Lecturer",
      ID: "Dosen Pengajar",
    },
  },
  {
    value: "wali",
    label: {
      EN: "Academic Advisor",
      ID: "Dosen Wali",
    },
  },
];

export const MAJORS: SelectOption[] = [
  {
    value: "S1 Sistem Informasi",
    label: {
      EN: "Bachelor of Information Systems",
      ID: "S1 Sistem Informasi",
    },
  },
  {
    value: "S1 Teknik Komputer",
    label: {
      EN: "Bachelor of Computer Engineering",
      ID: "S1 Teknik Komputer",
    },
  },
  {
    value: "D3 Sistem Informasi",
    label: {
      EN: "Diploma of Information Systems",
      ID: "D3 Sistem Informasi",
    },
  },
  {
    value: "S1 Desain Komunikasi Visual",
    label: {
      EN: "Bachelor of Visual Communication Design",
      ID: "S1 Desain Komunikasi Visual",
    },
  },
  {
    value: "S1 Desain Produk",
    label: {
      EN: "Bachelor of Product Design",
      ID: "S1 Desain Produk",
    },
  },
  {
    value: "D4 Produksi Film & Tv",
    label: {
      EN: "Bachelor of Film & Tv Production",
      ID: "D4 Produksi Film & Tv",
    },
  },
  {
    value: "S1 Manajemen",
    label: {
      EN: "Bachelor of Management",
      ID: "S1 Manajemen",
    },
  },
  {
    value: "S1 Akuntansi",
    label: {
      EN: "Bachelor of Accounting",
      ID: "S1 Akuntansi",
    },
  },
];

export const getMajorsByFaculty = (faculty: string): SelectOption[] => {
  switch (faculty) {
    case "Fakultas Teknologi dan Informatika":
      return [
        {
          value: "S1 Sistem Informasi",
          label: {
            EN: "Bachelor of Information Systems",
            ID: "S1 Sistem Informasi",
          },
        },
        {
          value: "S1 Teknik Komputer",
          label: {
            EN: "Bachelor of Computer Engineering",
            ID: "S1 Teknik Komputer",
          },
        },
        {
          value: "D3 Sistem Informasi",
          label: {
            EN: "Diploma of Information Systems",
            ID: "D3 Sistem Informasi",
          },
        },
      ];
    case "Fakultas Desain dan Industri Kreatif":
      return [
        {
          value: "S1 Desain Komunikasi Visual",
          label: {
            EN: "Bachelor of Visual Communication Design",
            ID: "S1 Desain Komunikasi Visual",
          },
        },
        {
          value: "S1 Desain Produk",
          label: {
            EN: "Bachelor of Product Design",
            ID: "S1 Desain Produk",
          },
        },
        {
          value: "D4 Produksi Film & Tv",
          label: {
            EN: "Bachelor of Film & Tv Production",
            ID: "D4 Produksi Film & Tv",
          },
        },
      ];
    case "Fakultas Ekonomi dan Bisnis":
      return [
        {
          value: "S1 Manajemen",
          label: {
            EN: "Bachelor of Management",
            ID: "S1 Manajemen",
          },
        },
        {
          value: "S1 Akuntansi",
          label: {
            EN: "Bachelor of Accounting",
            ID: "S1 Akuntansi",
          },
        },
      ];
    default:
      return [];
  }
};
