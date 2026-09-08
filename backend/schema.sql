-- Active: 1787547289621@@192.168.110.145@5432@dasl
-- Generated database schema for DASL application
-- This matches the current database structure

-- Drop existing tables if exists (for fresh setup)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS activity_points CASCADE;
DROP TABLE IF EXISTS sskm_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- Create users table with proper structure
CREATE TABLE users(
    id SERIAL NOT NULL,
    username varchar(50) NOT NULL, -- This serves as NIM for students, NIP for dosen/staff
    name varchar(100) NOT NULL,
    jurusan varchar(100),
    fakultas varchar(100),
    avatar varchar(255),
    password varchar(255) NOT NULL,
    role varchar(50) NOT NULL DEFAULT 'mahasiswa',
    status varchar(20) DEFAULT 'active', -- active, inactive
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create unique index on username
CREATE UNIQUE INDEX users_username_key ON users USING btree (username);

-- Create dosen_types table for lecturer type information
CREATE TABLE dosen_types(
    id SERIAL NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dosen_type varchar(20) NOT NULL CHECK (dosen_type IN ('pengajar', 'wali')),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    UNIQUE(user_id) -- Ensure each user has only one dosen type
);

-- Create index for foreign key relationship
CREATE INDEX dosen_types_user_id_key ON dosen_types USING btree (user_id);

-- Create sessions table for persistent session management
CREATE TABLE sessions(
    id SERIAL NOT NULL,
    session_id varchar(255) NOT NULL UNIQUE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    is_active boolean DEFAULT true,
    last_accessed timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create index on session_id for faster lookups
CREATE INDEX sessions_session_id_key ON sessions USING btree (session_id);
CREATE INDEX sessions_user_id_key ON sessions USING btree (user_id);

-- Create activity_points table for SSKM (Student Activity Point System)
CREATE TABLE activity_points(
    id SERIAL NOT NULL,
    student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type varchar(50) NOT NULL, -- organisasi, kemahasiswaan, penelitian, pengabdian, prestasi, keahlian
    activity_name varchar(255) NOT NULL,
    points integer NOT NULL CHECK (points > 0),
    description text,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create sskm_config table for SSKM configuration
CREATE TABLE sskm_config(
    id SERIAL NOT NULL,
    config_key varchar(50) NOT NULL UNIQUE,
    config_value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Insert default SSKM configuration
INSERT INTO sskm_config (config_key, config_value, description) VALUES 
('max_required_points', '100', 'Maximum required activity points per student'),
('academic_year', '2023/2024', 'Current academic year'),
('semester', 'Ganjil', 'Current semester');

-- Create indexes for sskm_config table
CREATE INDEX sskm_config_key_key ON sskm_config USING btree (config_key);

-- Create indexes for activity_points table
CREATE INDEX activity_points_student_id_key ON activity_points USING btree (student_id);
CREATE INDEX activity_points_activity_type_key ON activity_points USING btree (activity_type);
CREATE INDEX activity_points_date_key ON activity_points USING btree (date);

-- Create news table for campus news management
CREATE TABLE news(
    id SERIAL NOT NULL,
    title varchar(255) NOT NULL,
    content text NOT NULL,
    category varchar(50) NOT NULL,
    author varchar(100) NOT NULL,
    author_id integer REFERENCES users(id) ON DELETE SET NULL,
    publish_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    event_date date,
    event_start_time time,
    event_end_time time,
    is_active boolean DEFAULT true,
    featured boolean DEFAULT false,
    image_url varchar(500),
    tags varchar(500),
    view_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for news table
CREATE INDEX news_category_key ON news USING btree (category);
CREATE INDEX news_author_id_key ON news USING btree (author_id);
CREATE INDEX news_publish_date_key ON news USING btree (publish_date);
CREATE INDEX news_event_date_key ON news USING btree (event_date);
CREATE INDEX news_event_start_time_key ON news USING btree (event_start_time);
CREATE INDEX news_event_end_time_key ON news USING btree (event_end_time);
CREATE INDEX news_is_active_key ON news USING btree (is_active);
CREATE INDEX news_featured_key ON news USING btree (featured);

-- Create attendance_logs table for tracking user attendance
CREATE TABLE attendance_logs(
    id SERIAL NOT NULL,
    username varchar(100) NOT NULL REFERENCES users(username) ON DELETE CASCADE, -- Username (NIM) for direct reference
    name varchar(100), -- Full name for display
    check_time timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Combined check-in/check-out time
    location varchar(255),
    device_info varchar(255),
    device_name varchar(200), -- Device name from devices table
    ip_address inet,
    status varchar(20) DEFAULT 'present', -- present, late, absent, excused
    timestamp bigint, -- For ESP32 compatibility (milliseconds)
    date varchar(50), -- Added date field for card display (DD MMM YYYY)
    device_uid varchar(50), -- Added for NFC/smartphone UID storage
    response_time varchar(50), -- Response time for NFC/QR data transmission (e.g., "1.2s", "500ms")
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for attendance_logs

CREATE INDEX attendance_logs_username_key ON attendance_logs USING btree (username);
CREATE INDEX attendance_logs_name_key ON attendance_logs USING btree (name);
CREATE INDEX attendance_logs_check_time_key ON attendance_logs USING btree (check_time);
CREATE INDEX attendance_logs_status_key ON attendance_logs USING btree (status);
CREATE INDEX attendance_logs_date_key ON attendance_logs USING btree (date);
CREATE INDEX attendance_logs_device_uid_key ON attendance_logs USING btree (device_uid);
CREATE INDEX attendance_logs_device_name_key ON attendance_logs USING btree (device_name);

-- Create devices table for ESP32 device management
CREATE TABLE devices(
    id SERIAL NOT NULL,
    device_id varchar(100) UNIQUE NOT NULL,  -- ESP32 unique identifier
    device_name varchar(200),                -- Human-readable name for device
    location varchar(200),                   -- Physical location of device
    ip_address inet,                         -- Current IP address of device
    mac_address varchar(17) UNIQUE,          -- MAC address for identification
    firmware_version varchar(50),            -- Firmware version running on device
    status varchar(20) DEFAULT 'offline',    -- online, offline, error, in_use, pending_command
    session_id varchar(255),                 -- Current session ID for tracking (QR code for QR sessions)
    session_type varchar(20),                -- Session type: 'nfc' or 'qr'
    session_start timestamp,                 -- When current session started
    last_seen timestamp,                     -- Last heartbeat timestamp
    uid varchar(50),                         -- Last UID (NFC UID or QR code) that was read/generated
    username varchar(100),                   -- Username (NIM) associated with session (nullable for device registration)
    name varchar(100),                       -- Full name associated with session (nullable for device registration)
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for devices table
CREATE INDEX devices_device_id_key ON devices USING btree (device_id);
CREATE INDEX devices_mac_address_key ON devices USING btree (mac_address);
CREATE INDEX devices_status_key ON devices USING btree (status);
CREATE INDEX devices_last_seen_key ON devices USING btree (last_seen);
CREATE INDEX devices_session_id_key ON devices USING btree (session_id);
CREATE INDEX devices_session_type_key ON devices USING btree (session_type);
CREATE INDEX devices_uid_key ON devices USING btree (uid);
CREATE INDEX devices_username_key ON devices USING btree (username);
CREATE INDEX devices_name_key ON devices USING btree (name);

-- Add foreign key constraints for user references
ALTER TABLE devices ADD CONSTRAINT devices_username_fkey 
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE SET NULL;
ALTER TABLE devices ADD CONSTRAINT devices_name_fkey 
    FOREIGN KEY (name) REFERENCES users(name) ON DELETE SET NULL;

-- Add foreign key constraints for attendance logs
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_username_fkey 
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE SET NULL;
ALTER TABLE attendance_logs ADD CONSTRAINT attendance_logs_name_fkey 
    FOREIGN KEY (name) REFERENCES users(name) ON DELETE SET NULL;

-- Create courses table for course management
CREATE TABLE courses(
    id SERIAL NOT NULL,
    kode_matkul varchar(20) NOT NULL UNIQUE,
    nama_matkul varchar(255) NOT NULL,
    sks integer NOT NULL CHECK (sks > 0 AND sks <= 6),
    semester varchar(20) NOT NULL,
    jurusan varchar(100) NOT NULL,
    fakultas varchar(100),
    dosen_pengajar varchar(100),
    hari varchar(20),                      -- Day of the week (Senin, Selasa, etc.)
    room varchar(100),                     -- Room/classroom for the course
    start_time varchar(10),                -- Start time (HH:MM)
    end_time varchar(10),                  -- End time (HH:MM)
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for courses table
CREATE INDEX courses_kode_matkul_key ON courses USING btree (kode_matkul);
CREATE INDEX courses_nama_matkul_key ON courses USING btree (nama_matkul);
CREATE INDEX courses_semester_key ON courses USING btree (semester);
CREATE INDEX courses_jurusan_key ON courses USING btree (jurusan);
CREATE INDEX courses_fakultas_key ON courses USING btree (fakultas);
CREATE INDEX courses_dosen_pengajar_key ON courses USING btree (dosen_pengajar);
CREATE INDEX courses_hari_key ON courses USING btree (hari);
CREATE INDEX courses_room_key ON courses USING btree (room);
CREATE INDEX courses_is_active_key ON courses USING btree (is_active);

-- Function to automatically update updated_at timestamp for devices
CREATE OR REPLACE FUNCTION update_devices_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at timestamp for devices
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE
    ON devices FOR EACH ROW EXECUTE FUNCTION update_devices_updated_at_column();

-- Create max_activity_points table for SSKM max points configuration
CREATE TABLE max_activity_points(
    id SERIAL NOT NULL,
    max_points integer NOT NULL DEFAULT 100 CHECK (max_points > 0),
    description text DEFAULT 'Maximum required activity points per student',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Insert default max activity points
INSERT INTO max_activity_points (max_points, description) VALUES 
(100, 'Maximum required activity points per student');

-- Create indexes for max_activity_points table
CREATE INDEX max_activity_points_id_key ON max_activity_points USING btree (id);

-- Create schedule_requests table for schedule change requests
CREATE TABLE IF NOT EXISTS schedule_requests (
    id SERIAL NOT NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(255) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    room VARCHAR(255) NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    original_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for schedule_requests table
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON schedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_requested_by ON schedule_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_course_id ON schedule_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_requested_at ON schedule_requests(requested_at);

-- Add foreign key constraint (optional, already defined in column)
ALTER TABLE schedule_requests DROP CONSTRAINT IF EXISTS schedule_requests_course_id_fkey;
ALTER TABLE schedule_requests ADD CONSTRAINT schedule_requests_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Create perwalian_requests table for perwalian request settings
CREATE TABLE IF NOT EXISTS perwalian_requests (
    id SERIAL NOT NULL,
    status BOOLEAN DEFAULT false, -- Status switch untuk permohonan perwalian (true=aktif, false=nonaktif)
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Insert default value (status=false)
INSERT INTO perwalian_requests (status) VALUES (false) ON CONFLICT DO NOTHING;

-- Create index for perwalian_requests
CREATE INDEX IF NOT EXISTS perwalian_requests_status_key ON perwalian_requests USING btree (status);

-- Create perwalian_courses table for storing user course selections
CREATE TABLE IF NOT EXISTS perwalian_courses (
    id SERIAL NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, completed, cancelled
    requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Lecturer who approved
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for perwalian_courses table
CREATE INDEX IF NOT EXISTS perwalian_courses_user_id_key ON perwalian_courses USING btree (user_id);
CREATE INDEX IF NOT EXISTS perwalian_courses_course_id_key ON perwalian_courses USING btree (course_id);
CREATE INDEX IF NOT EXISTS perwalian_courses_status_key ON perwalian_courses USING btree (status);
CREATE INDEX IF NOT EXISTS perwalian_courses_approved_by_key ON perwalian_courses USING btree (approved_by);
CREATE INDEX IF NOT EXISTS perwalian_courses_requested_at_key ON perwalian_courses USING btree (requested_at);

-- Add unique constraint to prevent duplicate pending requests for same user+course
CREATE UNIQUE INDEX IF NOT EXISTS perwalian_courses_user_course_pending_unique 
ON perwalian_courses (user_id, course_id) 
WHERE status = 'pending';

-- Create chat_conversations table for storing chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL NOT NULL,
    title VARCHAR(255),
    type VARCHAR(20) NOT NULL DEFAULT 'direct', -- direct, group
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for chat_conversations table
CREATE INDEX IF NOT EXISTS chat_conversations_created_by_key ON chat_conversations USING btree (created_by);
CREATE INDEX IF NOT EXISTS chat_conversations_type_key ON chat_conversations USING btree (type);
CREATE INDEX IF NOT EXISTS chat_conversations_is_active_key ON chat_conversations USING btree (is_active);

-- Create chat_participants table for conversation members
CREATE TABLE IF NOT EXISTS chat_participants (
    id SERIAL NOT NULL,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT false,
    PRIMARY KEY(id),
    UNIQUE(conversation_id, user_id)
);

-- Create indexes for chat_participants table
CREATE INDEX IF NOT EXISTS chat_participants_conversation_id_key ON chat_participants USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS chat_participants_user_id_key ON chat_participants USING btree (user_id);

-- Create chat_messages table for storing messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL NOT NULL,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file
    file_url VARCHAR(500),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITHOUT TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    is_recalled BOOLEAN DEFAULT false,
    recalled_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- Create indexes for chat_messages table
CREATE INDEX IF NOT EXISTS chat_messages_conversation_id_key ON chat_messages USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_key ON chat_messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_key ON chat_messages USING btree (created_at);

