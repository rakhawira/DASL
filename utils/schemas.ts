import { z } from "zod";

// ==================== USER SCHEMAS ====================

export const UserRoleSchema = z.enum(["mahasiswa", "dosen", "admin", "staff"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const DosenTypeSchema = z.enum(["pengajar", "wali"]);
export type DosenType = z.infer<typeof DosenTypeSchema>;

export const UserStatusSchema = z.enum(["active", "inactive"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: UserRoleSchema.optional(),
});
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username is too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  role: UserRoleSchema.default("mahasiswa"),
  jurusan: z.string().optional(),
  fakultas: z.string().optional(),
  dosenType: DosenTypeSchema.optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

// ==================== CHAT SCHEMAS ====================

export const MessageTypeSchema = z.enum(["text", "image", "file"]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const ConversationTypeSchema = z.enum(["direct", "group"]);
export type ConversationType = z.infer<typeof ConversationTypeSchema>;

export const CreateConversationRequestSchema = z.object({
  title: z.string().optional(),
  type: ConversationTypeSchema.default("direct"),
  created_by: z.number().int().positive("Created by must be a positive number"),
  participant_ids: z.array(z.number().int().positive()).default([]),
});
export type CreateConversationRequest = z.infer<
  typeof CreateConversationRequestSchema
>;

export const SendMessageRequestSchema = z.object({
  conversation_id: z.number().int().positive("Conversation ID is required"),
  sender_id: z.number().int().positive("Sender ID is required"),
  message: z.string().min(1, "Message is required"),
  message_type: MessageTypeSchema.default("text"),
  file_url: z.string().url().optional().or(z.literal("")),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const MarkAsReadRequestSchema = z.object({
  conversation_id: z.number().int().positive("Conversation ID is required"),
  user_id: z.number().int().positive("User ID is required"),
});
export type MarkAsReadRequest = z.infer<typeof MarkAsReadRequestSchema>;

export const DeleteMessageRequestSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
});
export type DeleteMessageRequest = z.infer<typeof DeleteMessageRequestSchema>;

export const EditMessageRequestSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
  message: z.string().min(1, "Message cannot be empty"),
});
export type EditMessageRequest = z.infer<typeof EditMessageRequestSchema>;

export const AddParticipantRequestSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
});
export type AddParticipantRequest = z.infer<typeof AddParticipantRequestSchema>;

// ==================== COURSE SCHEMAS ====================

export const CreateCourseSchema = z.object({
  kode_matkul: z
    .string()
    .min(1, "Course code is required")
    .max(20, "Course code is too long"),
  nama_matkul: z
    .string()
    .min(1, "Course name is required")
    .max(255, "Course name is too long"),
  sks: z
    .number()
    .int()
    .min(1, "SKS must be at least 1")
    .max(6, "SKS cannot exceed 6"),
  semester: z.string().min(1, "Semester is required"),
  jurusan: z.string().min(1, "Jurusan is required"),
  fakultas: z.string().optional(),
  dosen_pengajar: z.string().optional(),
  hari: z.string().optional(),
  room: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});
export type CreateCourse = z.infer<typeof CreateCourseSchema>;

export const UpdateCourseSchema = z.object({
  kode_matkul: z
    .string()
    .min(1, "Course code is required")
    .max(20, "Course code is too long")
    .optional(),
  nama_matkul: z
    .string()
    .min(1, "Course name is required")
    .max(255, "Course name is too long")
    .optional(),
  sks: z
    .number()
    .int()
    .min(1, "SKS must be at least 1")
    .max(6, "SKS cannot exceed 6")
    .optional(),
  semester: z.string().min(1, "Semester is required").optional(),
  jurusan: z.string().min(1, "Jurusan is required").optional(),
  fakultas: z.string().optional(),
  dosen_pengajar: z.string().optional(),
  hari: z.string().optional(),
  room: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateCourse = z.infer<typeof UpdateCourseSchema>;

// ==================== LOGS SCHEMAS ====================

export const AttendanceStatusSchema = z.enum(["present", "late", "absent"]);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const LogFiltersSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  user_id: z.string().optional(),
  status: AttendanceStatusSchema.optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});
export type LogFilters = z.infer<typeof LogFiltersSchema>;

// ==================== PAGINATION SCHEMAS ====================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(50),
});
export type Pagination = z.infer<typeof PaginationSchema>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate data against a zod schema and return the result
 * @param schema The zod schema to validate against
 * @param data The data to validate
 * @returns The validation result with success flag and data or errors
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}

/**
 * Validate data against a zod schema and throw if invalid
 * @param schema The zod schema to validate against
 * @param data The data to validate
 * @returns The validated data
 * @throws ZodError if validation fails
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
