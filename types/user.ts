export type UserRole = "mahasiswa" | "dosen" | "admin" | "staff";

export interface User {
  id: number;
  username: string; // NIM for students, NIP for dosen/staff, custom for admin
  name: string;
  role: UserRole;
  jurusan?: string; // Untuk mahasiswa dan dosen
  fakultas?: string; // Untuk mahasiswa dan dosen
  dosenType?: "pengajar" | "wali"; // Untuk dosen
  avatar?: string;
  status?: "active" | "inactive"; // User status
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string; // NIM for students, NIP for dosen/staff, custom for admin
  password: string;
  role?: UserRole;
}

export interface CreateUser {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  jurusan?: string;
  fakultas?: string;
  dosenType?: "pengajar" | "wali"; // Untuk dosen
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RolePermissions {
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canManageCourses: boolean;
  canViewReports: boolean;
  canManageSystem: boolean;
}

export const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case "admin":
      return {
        canAccessDashboard: true,
        canManageUsers: true,
        canManageCourses: true,
        canViewReports: true,
        canManageSystem: true,
      };
    case "dosen":
      return {
        canAccessDashboard: true,
        canManageUsers: false,
        canManageCourses: true,
        canViewReports: true,
        canManageSystem: false,
      };
    case "staff":
      return {
        canAccessDashboard: true,
        canManageUsers: false,
        canManageCourses: false,
        canViewReports: true,
        canManageSystem: false,
      };
    case "mahasiswa":
      return {
        canAccessDashboard: true,
        canManageUsers: false,
        canManageCourses: false,
        canViewReports: false,
        canManageSystem: false,
      };
    default:
      return {
        canAccessDashboard: false,
        canManageUsers: false,
        canManageCourses: false,
        canViewReports: false,
        canManageSystem: false,
      };
  }
};
