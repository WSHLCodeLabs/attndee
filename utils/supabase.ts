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
export interface ActiveRoom {
  id: string;
  created_at: string;
  secret_key: string;
  teacher_lat: number;
  teacher_long: number;
  checkin_duration_mins: number;
  room_name: string; // Attndee rebrand: Room/class name
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
