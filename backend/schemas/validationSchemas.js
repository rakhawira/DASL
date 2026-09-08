const { z } = require("zod");

// User Role Schema
const UserRoleSchema = z.enum(["mahasiswa", "dosen", "admin", "staff"]);

// Dosen Type Schema
const DosenTypeSchema = z.enum(["pengajar", "wali"]);

// User Status Schema
const UserStatusSchema = z.enum(["active", "inactive"]);

// Login Schema
const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  role: UserRoleSchema.optional(),
});

// Logout Schema
const LogoutSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

// Create User Schema
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username is too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleSchema.default("mahasiswa"),
  jurusan: z.string().optional(),
  fakultas: z.string().optional(),
  dosenType: DosenTypeSchema.optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});

// Update User Schema
const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name is too long")
    .optional(),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username is too long")
    .optional(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  role: UserRoleSchema.optional(),
  jurusan: z.string().optional(),
  fakultas: z.string().optional(),
  dosenType: DosenTypeSchema.optional(),
  avatar: z.string().url().optional().or(z.literal("")),
});

// Numeric ID Schema
const NumericIdSchema = z
  .string()
  .regex(/^\d+$/, "Invalid ID format")
  .or(z.number());

// Chat Message Type Schema
const MessageTypeSchema = z.enum(["text", "image", "file"]);

// Conversation Type Schema
const ConversationTypeSchema = z.enum(["direct", "group"]);

// Create Conversation Schema
const CreateConversationSchema = z.object({
  title: z.string().optional(),
  type: ConversationTypeSchema.default("direct"),
  created_by: z.number().int().positive("Created by must be a positive number"),
  participant_ids: z.array(z.number().int().positive()).default([]),
});

// Send Message Schema
const SendMessageSchema = z.object({
  conversation_id: z.number().int().positive("Conversation ID is required"),
  sender_id: z.number().int().positive("Sender ID is required"),
  message: z.string().min(1, "Message is required"),
  message_type: MessageTypeSchema.default("text"),
  file_url: z.string().url().optional().or(z.literal("")),
});

// Mark as Read Schema
const MarkAsReadSchema = z.object({
  conversation_id: z.number().int().positive("Conversation ID is required"),
  user_id: z.number().int().positive("User ID is required"),
});

// Delete Message Schema
const DeleteMessageSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
});

// Edit Message Schema
const EditMessageSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
  message: z.string().min(1, "Message cannot be empty"),
});

// Add Participant Schema
const AddParticipantSchema = z.object({
  user_id: z.number().int().positive("User ID is required"),
});

// Course Schema
const CourseSchema = z.object({
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

// Attendance Log Schema
const AttendanceLogSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  jurusan: z.string().min(1, "Jurusan is required"),
  checkTime: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["present", "late", "absent"]),
  date: z.string().optional(),
  device_uid: z.string().optional(),
  device_name: z.string().optional(),
});

// Log Filters Schema
const LogFiltersSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  user_id: z.string().optional(),
  status: z.enum(["present", "late", "absent"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

// Pagination Schema
const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(50),
});

module.exports = {
  UserRoleSchema,
  DosenTypeSchema,
  UserStatusSchema,
  LoginSchema,
  LogoutSchema,
  CreateUserSchema,
  UpdateUserSchema,
  NumericIdSchema,
  MessageTypeSchema,
  ConversationTypeSchema,
  CreateConversationSchema,
  SendMessageSchema,
  MarkAsReadSchema,
  DeleteMessageSchema,
  EditMessageSchema,
  AddParticipantSchema,
  CourseSchema,
  AttendanceLogSchema,
  LogFiltersSchema,
  PaginationSchema,
};
