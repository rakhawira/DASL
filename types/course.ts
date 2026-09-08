export interface Course {
  id: number;
  kode_matkul: string;
  nama_matkul: string;
  sks: number;
  semester: string;
  jurusan: string;
  fakultas?: string;
  dosen_pengajar?: string;
  hari?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCourse {
  kode_matkul: string;
  nama_matkul: string;
  sks: number;
  semester: string;
  jurusan: string;
  fakultas?: string;
  dosen_pengajar?: string;
  hari?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
}

export interface UpdateCourse {
  kode_matkul?: string;
  nama_matkul?: string;
  sks?: number;
  semester?: string;
  jurusan?: string;
  fakultas?: string;
  dosen_pengajar?: string;
  hari?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}
