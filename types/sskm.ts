export interface ActivityPoint {
  id: number;
  student_id: number;
  student_name: string;
  activity_type: string;
  activity_name: string;
  points: number;
  date: string;
  description: string;
  semester: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityPoint {
  student_id: number;
  activity_type: string;
  activity_name: string;
  points: number;
  date: string;
  description: string;
  semester: string;
  academic_year: string;
}

export interface UpdateActivityPoint {
  activity_type?: string;
  activity_name?: string;
  points?: number;
  date?: string;
  description?: string;
  semester?: string;
  academic_year?: string;
}

export interface ActivityCategory {
  id: string;
  name: string;
  nameId: string;
  icon: string;
  color: string;
  maxPoints: number;
}

export interface SSKMStats {
  totalStudents: number;
  activeStudents: number;
  avgPoints: number;
  totalActivities: number;
}
