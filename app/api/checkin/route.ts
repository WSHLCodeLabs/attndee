/**
 * Check-in API Endpoint (Phase 2)
 * 
 * Purpose: Validate student check-in requests with multiple validation layers.
 * Validations: Duration-based expiry, TOTP token, GPS distance (50m), duplicate check
 * Phase 2: Accepts and stores student profile data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { isPointWithinRadius } from 'geolib';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/checkin
 * Request body: {
 *   room_id, token, student_id, student_lat, student_long,
 *   first_name, last_name, year_level  // Phase 2 fields
 * }
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const {
            room_id,
            token,
            student_id,
            student_lat,
            student_long,
            first_name,
            last_name,
            year_level,
        } = body;

        // Validate required fields (Phase 2: includes profile fields)
        if (
            !room_id ||
            !token ||
            !student_id ||
            student_lat === undefined ||
            student_long === undefined ||
            !first_name ||
            !last_name ||
            year_level === undefined
        ) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Query active_rooms by ID
        const { data: room, error: roomError } = await supabase
            .from('active_rooms')
            .select('*')
            .eq('id', room_id)
            .single();

        if (roomError || !room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        // VALIDATION 1: Check if check-in time is expired (Phase 2: use checkin_duration_mins)
        const createdAt = new Date(room.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        if (diffMinutes > room.checkin_duration_mins) {
            return NextResponse.json(
                { error: `Check-in time has ended (${room.checkin_duration_mins} min limit)` },
                { status: 410 } // 410 Gone
            );
        }

        // VALIDATION 2: Verify TOTP token (standard approach)
        authenticator.options = {
            step: 30
        };

        const isValidToken = authenticator.check(token, room.secret_key);

        if (!isValidToken) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // VALIDATION 3: Check GPS distance (student must be within 50m of teacher)
        const isWithinRange = isPointWithinRadius(
            { latitude: student_lat, longitude: student_long },
            { latitude: room.teacher_lat, longitude: room.teacher_long },
            50 // 50 meters
        );

        if (!isWithinRange) {
            return NextResponse.json(
                { error: 'You are too far from the teacher (must be within 50m)' },
                { status: 403 }
            );
        }

        // VALIDATION 4: Check for duplicate check-in
        const { data: existingAttendance } = await supabase
            .from('attendance')
            .select('id')
            .eq('room_id', room_id)
            .eq('student_id', student_id)
            .single();

        if (existingAttendance) {
            return NextResponse.json(
                { error: 'You have already checked in to this room' },
                { status: 409 } // 409 Conflict
            );
        }

        // All validations passed - insert attendance record (Phase 2: includes profile fields)
        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                room_id: room_id,
                student_id: student_id,
                student_lat: student_lat,
                student_long: student_long,
                first_name: first_name,
                last_name: last_name,
                year_level: year_level,
            });

        if (insertError) {
            console.error('Attendance insert error:', insertError);
            return NextResponse.json(
                {
                    error: 'Failed to record attendance',
                    details: insertError.message || insertError.toString(),
                    code: insertError.code
                },
                { status: 500 }
            );
        }

        // Success response
        return NextResponse.json(
            {
                success: true,
                message: `Welcome, ${first_name}! Check-in successful.`,
                student_id: student_id,
                student_name: `${first_name} ${last_name}`,
                checked_in_at: new Date().toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Check-in error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/checkin (optional - for testing)
 */
export async function GET() {
    return NextResponse.json(
        {
            message: 'Check-in API endpoint (Phase 2)',
            usage: 'POST with { room_id, token, student_id, student_lat, student_long, first_name, last_name, year_level }',
        },
        { status: 200 }
    );
}
