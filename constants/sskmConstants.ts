import { ActivityCategory } from "../../types/sskm";

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: "organisasi",
    name: "Organization",
    nameId: "Organisasi",
    icon: "people-outline",
    color: "#3B82F6",
    maxPoints: 30,
  },
  {
    id: "kemahasiswaan",
    name: "Student Affairs",
    nameId: "Kemahasiswaan",
    icon: "school-outline",
    color: "#10B981",
    maxPoints: 25,
  },
  {
    id: "penelitian",
    name: "Research",
    nameId: "Penelitian",
    icon: "search-outline",
    color: "#8B5CF6",
    maxPoints: 20,
  },
  {
    id: "pengabdian",
    name: "Community Service",
    nameId: "Pengabdian Masyarakat",
    icon: "heart-outline",
    color: "#EF4444",
    maxPoints: 15,
  },
  {
    id: "prestasi",
    name: "Achievements",
    nameId: "Prestasi",
    icon: "trophy-outline",
    color: "#F59E0B",
    maxPoints: 25,
  },
  {
    id: "keahlian",
    name: "Skills",
    nameId: "Keahlian",
    icon: "build-outline",
    color: "#06B6D4",
    maxPoints: 10,
  },
];

export const MAX_REQUIRED_POINTS = 100;
