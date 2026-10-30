/**
 * Check-in API Endpoint (Attndee Production Engine)
 *
 * Works with the original Supabase schema (zero custom columns required on active_rooms):
 * - active_rooms: id, created_at, secret_key, teacher_lat, teacher_long, checkin_duration_mins, room_name
 * - attendance: id, room_id, student_id, student_lat, student_long, checkin_time, first_name, last_name, year_level
 *
 * Uses in-memory session state (globalThis.__attndeeRoomMemory) for:
 * - Early session closure flag (is_closed)
 * - Column Z roster fingerprint verification & new device fingerprint recording
 * - Cross-browser / Incognito same-session device anti-cheat
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticator } from 'otplib';
import { getDistance } from 'geolib';
import { DeviceCheckinRecord, KURosterStudent } from '@/utils/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CachedRoomMeta {
  id: string;
  room_name: string;
  secret_key: string;
  teacher_lat: number;
  teacher_long: number;
  checkin_duration_mins: number;
  created_at: string;
}

interface RoomRuntimeMemory {
  is_closed: boolean;
  radius_meters: number;
  roster_students: KURosterStudent[];
  device_checkins: DeviceCheckinRecord[];
  student_fingerprints: Record<string, string>;
  checked_in_student_ids: Set<string>;
  room_meta?: CachedRoomMeta;
}

const globalForAttndee = globalThis as unknown as {
  __attndeeRoomMemory?: Map<string, RoomRuntimeMemory>;
};

if (!globalForAttndee.__attndeeRoomMemory) {
  globalForAttndee.__attndeeRoomMemory = new Map<string, RoomRuntimeMemory>();
}

const roomMemoryMap = globalForAttndee.__attndeeRoomMemory;

function getOrCreateRoomMemory(roomId: string): RoomRuntimeMemory {
  let mem = roomMemoryMap.get(roomId);
  if (!mem) {
    mem = {
      is_closed: false,
      radius_meters: 50,
      roster_students: [],
      device_checkins: [],
      student_fingerprints: {},
      checked_in_student_ids: new Set<string>(),
    };
    roomMemoryMap.set(roomId, mem);
  } else if (!mem.checked_in_student_ids) {
    mem.checked_in_student_ids = new Set<string>();
  }
  return mem;
}

/**
 * PUT /api/checkin
 * Used by Teacher Workspace to register roster students / Column Z fingerprints or close session early
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, is_closed, roster_students, radius_meters } = body;

    if (!room_id) {
      return NextResponse.json({ error: 'Missing room_id' }, { status: 400 });
    }

    const mem = getOrCreateRoomMemory(room_id);

    if (typeof is_closed === 'boolean') {
      mem.is_closed = is_closed;
    }

    if (typeof radius_meters === 'number') {
      mem.radius_meters = radius_meters;
    }

    if (Array.isArray(roster_students)) {
      mem.roster_students = roster_students;
      for (const s of roster_students) {
        if (s.student_id && s.device_fingerprint && s.device_fingerprint !== 'unknown') {
          mem.student_fingerprints[String(s.student_id).trim()] = s.device_fingerprint;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT /api/checkin error:', err);
    return NextResponse.json({ error: 'Failed to update room memory' }, { status: 500 });
  }
}

/**
 * POST /api/checkin
 */
export async function POST(request: NextRequest) {
  try {
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
      device_fingerprint,
      is_manual_override = false,
    } = body;

    if (!room_id || !student_id || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required fields (room_id, student_id, first_name, last_name)' },
        { status: 400 }
      );
    }

    if (!is_manual_override) {
      if (
        !token ||
        student_lat === undefined ||
        student_long === undefined ||
        year_level === undefined
      ) {
        return NextResponse.json(
          { error: 'Missing check-in parameters (token, coordinates, or year_level)' },
          { status: 400 }
        );
      }
    }

    const mem = getOrCreateRoomMemory(room_id);

    // Fast-path: use cached room metadata if available, otherwise query once from Supabase
    let room = mem.room_meta;
    if (!room) {
      const { data: dbRoom, error: roomError } = await supabase
        .from('active_rooms')
        .select('id, created_at, secret_key, teacher_lat, teacher_long, checkin_duration_mins, room_name')
        .eq('id', room_id)
        .single();

      if (roomError || !dbRoom) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      room = {
        id: dbRoom.id,
        created_at: dbRoom.created_at,
        secret_key: dbRoom.secret_key,
        teacher_lat: dbRoom.teacher_lat,
        teacher_long: dbRoom.teacher_long,
        checkin_duration_mins: dbRoom.checkin_duration_mins,
        room_name: dbRoom.room_name,
      };
      mem.room_meta = room;
    }

    // VALIDATION 1: Session Status & Expiry (Instant memory check)
    if (!is_manual_override) {
      if (mem.is_closed) {
        return NextResponse.json(
          { error: 'Check-in for this class has been closed by the instructor' },
          { status: 410 }
        );
      }

      const createdAt = new Date(room.created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if (diffMinutes > room.checkin_duration_mins) {
        return NextResponse.json(
          { error: `Check-in time has ended (${room.checkin_duration_mins} min limit)` },
          { status: 410 }
        );
      }
    }

    // VALIDATION 2: Verify TOTP Token with Grace Window (+/- 1 step = 30s)
    // Synchronized to the room's creation time (elapsedSessionMs) so 30s cycles align with 05:00 -> 04:30 -> 04:00
    if (!is_manual_override) {
      const createdAtMs = new Date(room.created_at).getTime();
      const elapsedSessionMs = Math.max(0, Date.now() - createdAtMs);

      authenticator.options = {
        step: 30,
        window: 1,
        epoch: elapsedSessionMs,
      };
      let isValidToken = authenticator.check(token, room.secret_key);

      // Fallback check against standard Unix wall-clock epoch for backward compatibility
      if (!isValidToken) {
        authenticator.options = {
          step: 30,
          window: 1,
          epoch: Date.now(),
        };
        isValidToken = authenticator.check(token, room.secret_key);
      }

      if (!isValidToken) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }

    // VALIDATION 3: GPS Radius & Distance Reporting (Instant in-memory Haversine formula)
    let distanceMeters = 0;
    if (!is_manual_override) {
      const allowedRadius = mem.radius_meters || 50;

      distanceMeters = getDistance(
        { latitude: Number(student_lat), longitude: Number(student_long) },
        { latitude: Number(room.teacher_lat), longitude: Number(room.teacher_long) }
      );

      if (distanceMeters > allowedRadius) {
        return NextResponse.json(
          {
            error: `You are ${distanceMeters}m away from the classroom (must be within ${allowedRadius}m)`,
            distance: distanceMeters,
            allowed_radius: allowedRadius,
          },
          { status: 403 }
        );
      }
    }

    // VALIDATION 4: Duplicate Student ID Check (Instant in-memory Set check first)
    const cleanStudentId = String(student_id).trim();
    if (mem.checked_in_student_ids.has(cleanStudentId)) {
      return NextResponse.json(
        { error: 'You have already checked in to this room' },
        { status: 409 }
      );
    }

    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('room_id', room_id)
      .eq('student_id', cleanStudentId)
      .maybeSingle();

    if (existingAttendance) {
      mem.checked_in_student_ids.add(cleanStudentId);
      return NextResponse.json(
        { error: 'You have already checked in to this room' },
        { status: 409 }
      );
    }

    // VALIDATION 5: Cross-Browser & Column Z Fingerprint Anti-Cheat
    const rawForwarded = request.headers.get('x-forwarded-for');
    const clientIp = rawForwarded
      ? rawForwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';

    if (!is_manual_override) {
      const rosterStudents = mem.roster_students;

      if (device_fingerprint && device_fingerprint !== 'unknown') {
        // Check 1: Is this hardware fingerprint bound to a DIFFERENT student in the .xlsx roster?
        const boundToOther = rosterStudents.find(
          (s) =>
            String(s.student_id).trim() !== cleanStudentId &&
            s.device_fingerprint &&
            s.device_fingerprint.toLowerCase() !== 'unknown' &&
            s.device_fingerprint === device_fingerprint
        );

        if (boundToOther) {
          return NextResponse.json(
            {
              error: `Anti-Cheat Alert: อุปกรณ์นี้ผูกอยู่กับรหัสนิสิต ${boundToOther.student_id} ในไฟล์รายชื่อวิชาแล้ว ไม่สามารถใช้เช็คชื่อแทนกันได้`,
              code: 'DEVICE_ALREADY_USED',
            },
            { status: 403 }
          );
        }

        // Check 2: Does this student ID already have a DIFFERENT device fingerprint bound in the .xlsx roster?
        const currentRosterStudent = rosterStudents.find(
          (s) => String(s.student_id).trim() === cleanStudentId
        );

        if (
          currentRosterStudent?.device_fingerprint &&
          currentRosterStudent.device_fingerprint.toLowerCase() !== 'unknown' &&
          currentRosterStudent.device_fingerprint !== device_fingerprint
        ) {
          return NextResponse.json(
            {
              error: `Anti-Cheat Alert: รหัสนิสิต ${cleanStudentId} ได้ผูกกับอุปกรณ์เครื่องอื่นไว้ในใบรายชื่อวิชาแล้ว กรุณาใช้อุปกรณ์ประจำตัวของท่าน`,
              code: 'DEVICE_ALREADY_USED',
            },
            { status: 403 }
          );
        }
      }

      // Check 3: Same-session device check-in registry
      for (const record of mem.device_checkins) {
        if (String(record.student_id).trim() === cleanStudentId) continue;

        const hasValidFingerprint =
          device_fingerprint &&
          device_fingerprint !== 'unknown' &&
          record.fingerprint &&
          record.fingerprint !== 'unknown';

        if (hasValidFingerprint && record.fingerprint === device_fingerprint) {
          return NextResponse.json(
            {
              error: `Anti-Cheat Alert: อุปกรณ์นี้ได้ทำการเช็คชื่อให้นิสิตคนอื่น (${record.student_id}) ในคาบเรียนนี้ไปแล้ว`,
              code: 'DEVICE_ALREADY_USED',
            },
            { status: 403 }
          );
        }
      }
    }

    // Insert attendance record into Supabase
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        room_id: room_id,
        student_id: cleanStudentId,
        student_lat: student_lat ?? 0,
        student_long: student_long ?? 0,
        first_name: first_name,
        last_name: last_name,
        year_level: year_level ?? 1,
      });

    if (insertError) {
      console.error('Attendance insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to record attendance',
          details: insertError.message || insertError.toString(),
        },
        { status: 500 }
      );
    }

    // Mark as checked-in in memory for instant duplicate rejection
    mem.checked_in_student_ids.add(cleanStudentId);

    // Record device fingerprint in runtime memory for Column Z export & anti-cheat
    if (device_fingerprint && device_fingerprint !== 'unknown' && !is_manual_override) {
      mem.student_fingerprints[cleanStudentId] = device_fingerprint;
      mem.device_checkins.push({
        fingerprint: device_fingerprint,
        student_id: cleanStudentId,
        student_name: `${first_name} ${last_name}`.trim(),
        ip: clientIp,
        lat: student_lat ?? 0,
        long: student_long ?? 0,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Welcome, ${first_name}! Check-in successful.`,
        student_id: cleanStudentId,
        student_name: `${first_name} ${last_name}`.trim(),
        room_name: room.room_name,
        checked_in_at: new Date().toISOString(),
        distance: !is_manual_override ? distanceMeters : 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check-in server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/checkin?room_id=...
 * Returns runtime session state (is_closed, student_fingerprints) for the room
 */
export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('room_id');
  if (roomId) {
    const mem = getOrCreateRoomMemory(roomId);
    return NextResponse.json(
      {
        room_id: roomId,
        is_closed: mem.is_closed,
        student_fingerprints: mem.student_fingerprints,
        device_checkins: mem.device_checkins,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      message: 'Attndee Check-in Engine API',
      status: 'operational',
    },
    { status: 200 }
  );
}
