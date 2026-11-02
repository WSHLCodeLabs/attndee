/**
 * Supabase Client Initialization
 * 
 * Purpose: Initialize and export a configured Supabase client for database operations.
 * Uses environment variables for URL and anon key.
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * Supabase client instance
 * Configured with public URL and anon key for client-side operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database type definitions for type safety
 */
export interface KURosterStudent {
  row_index: number; // 0-based index in xlsx_data
  seq?: string | number;
  student_id: string;
  name_th: string;
  name_en?: string;
  first_name: string;
  last_name: string;
  faculty?: string;
  major?: string;
  major_code?: string;
  status?: string; // e.g. 'W', 'Drop', ''
  email_google?: string;
  email_office365?: string;
  device_fingerprint?: string; // Stored in Column Z (index 25) of the XLSX file
}

export interface CourseMetadata {
  is_ku_format: boolean;
  course_code?: string;
  course_name?: string;
  full_title?: string;
  section?: string;
  credits?: string;
  campus?: string;
  semester_info?: string;
  instructor?: string;
  header_row_index: number; // 0-based row index of the table header
  id_col_index: number; // 0-based column index of student_id
  name_th_col_index: number; // 0-based column index of Thai name (or primary name)
  name_en_col_index?: number; // 0-based column index of English name
  status_col_index?: number; // 0-based column index of Drop/W status
  fingerprint_col_index?: number; // 0-based column index for device fingerprint (default 25 = Col Z)
}

export interface DeviceCheckinRecord {
  fingerprint: string;
  student_id: string;
  student_name: string;
  ip?: string;
  lat: number;
  long: number;
  timestamp: string;
}

export interface StudentListJson {
  xlsx_data?: any[][];
  xlsx_base64?: string;
  id_column?: string;
  checkmark_column?: string;
  filename?: string;
  cloud_file_id?: string;
  // Enhanced KU Roster & Room Control Metadata
  has_roster?: boolean;
  course_meta?: CourseMetadata;
  roster_students?: KURosterStudent[];
  radius_meters?: number; // Configurable GPS radius (default 50m)
  is_closed?: boolean; // Persist closed state without deleting room
  closed_at?: string;
  device_checkins?: DeviceCheckinRecord[]; // Cross-browser / Incognito device lock registry
  late_student_ids?: string[]; // Optional list of student_ids marked as late
}

export interface TeacherCloudFile {
  id: string;
  teacher_id: string;
  filename: string;
  storage_path: string;
  course_name?: string | null;
  student_count: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveRoom {
  id: string;
  created_at: string;
  secret_key: string;
  teacher_lat: number;
  teacher_long: number;
  checkin_duration_mins: number;
  room_name: string; // Attndee rebrand: Room/class name
  teacher_id?: string | null;
  student_list_json?: StudentListJson | null;
}

export interface Attendance {
  id: string;
  room_id: string;
  student_id: string;
  student_lat: number;
  student_long: number;
  checkin_time: string; // Timestamp when student checked in
  first_name: string; // Phase 2: Student profile
  last_name: string;  // Phase 2: Student profile
  year_level: number; // Phase 2: Student profile
}
