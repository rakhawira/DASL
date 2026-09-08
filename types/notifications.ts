export interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "update" | "news" | "points" | "admin" | "schedule" | "attendance";
  isRead: boolean;
}

export interface CourseStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  courseCode: string;
  courseName: string;
  enrolledAt: string;
  attendance?: number;
  grade?: string;
  status: "active" | "inactive" | "completed";
}

export interface LecturerCourse {
  id: string;
  code: string;
  name: string;
  schedule: string;
  room: string;
  students: CourseStudent[];
  totalStudents: number;
  maxStudents: number;
  isActive: boolean;
}

export interface ClassSchedule {
  id: string;
  courseName: string;
  courseCode: string;
  schedule: string;
  room: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  isActive: boolean;
}
