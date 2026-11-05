'use client';

/**
 * Student Check-in View (Optimized, Thai Localized & Editable Pass)
 *
 * Minimalist student check-in experience with:
 * - Direct profile/pass editing from ANY screen (header chip, success card, already checked-in card)
 * - Sub-second check-in via background GPS pre-warming & fingerprint memoization
 * - Fast-path check-in parallelization (zero client waterfall delays)
 * - Local Attndee. Pass™ credential memory + 7-day edit cooldown
 * - Seamless first-time check-in (auto-submits token after pass creation)
 * - Hardware device fingerprint anti-cheat (cross-browser & Column Z verification)
 * - Strict GPS verification with distance reporting
 * - Complete Thai localization
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/utils/supabase';
import PassCard, { StudentProfile } from '@/components/PassCard';
import {
  getDeviceFingerprint,
  getPassCooldownStatus,
  isDeviceCheckedInRoom,
  markDeviceCheckedInRoom,
} from '@/utils/fingerprint';

type CheckInStatus =
  | 'idle'
  | 'checking'
  | 'success'
  | 'error'
  | 'manual'
  | 'gps_required';

interface CachedGps {
  lat: number;
  long: number;
  timestamp: number;
}

export default function CheckInPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const tokenFromUrl = searchParams.get('token');

  const [status, setStatus] = useState<CheckInStatus>('idle');
  const [message, setMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<StudentProfile | null>(null);

  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined);
  const [showPassCard, setShowPassCard] = useState(false);
  const [roomName, setRoomName] = useState<string>('');
  const [isRoomClosed, setIsRoomClosed] = useState(false);
  const [deviceBlockedMsg, setDeviceBlockedMsg] = useState<string | null>(null);
  const [notInRosterMsg, setNotInRosterMsg] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<{ distance: number; allowedRadius: number } | null>(null);

  const isSubmitting = useRef(false);
  const autoCheckInAttempted = useRef(false);

  // GPS & Fingerprint Fast-Path Optimization
  const cachedGpsRef = useRef<CachedGps | null>(null);
  const pendingGpsPromiseRef = useRef<Promise<{ lat: number; long: number }> | null>(null);

  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinCode, setPinCode] = useState(['', '', '', '', '', '']);
  const [errorType, setErrorType] = useState<'none' | 'already_checked_in' | 'gps_denied' | 'expired_token'>('none');

  // Fast GPS Pre-warming
  const prewarmGPS = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (pendingGpsPromiseRef.current) return;

    pendingGpsPromiseRef.current = new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, long: pos.coords.longitude };
          cachedGpsRef.current = { ...coords, timestamp: Date.now() };
          pendingGpsPromiseRef.current = null;
          resolve(coords);
        },
        (err) => {
          pendingGpsPromiseRef.current = null;
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  // 1. Mount Initialization: GPS Pre-warming, Fingerprint Pre-computation, and Pass Profile Loading
  useEffect(() => {
    prewarmGPS();
    getDeviceFingerprint().catch(() => {});

    let storedProfile = localStorage.getItem('attndee_pass');

    if (!storedProfile) {
      const oldProfile = localStorage.getItem('student_profile');
      if (oldProfile) {
        localStorage.setItem('attndee_pass', oldProfile);
        localStorage.removeItem('student_profile');
        storedProfile = oldProfile;
      }
    }

    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as StudentProfile;
        setProfile(parsed);
        profileRef.current = parsed;
      } catch {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, [prewarmGPS]);

  useEffect(() => {
    profileRef.current = profile ?? null;
  }, [profile]);

  // 2. Fetch room details in background
  useEffect(() => {
    if (!roomId) return;

    const fetchRoomDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('active_rooms')
          .select('room_name, checkin_duration_mins, created_at')
          .eq('id', roomId)
          .single();

        if (data && !error) {
          setRoomName(data.room_name);
          const res = await fetch(`/api/checkin?room_id=${encodeURIComponent(roomId)}`);
          if (res.ok) {
            const memData = await res.json();
            if (memData.is_closed === true) {
              setIsRoomClosed(true);
            }
          }
        } else {
          setErrorType('expired_token');
          setRoomName('ไม่พบห้องเรียน');
        }
      } catch {
        setErrorType('expired_token');
        setRoomName('ไม่พบห้องเรียน');
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // 3. Check local device lock on mount
  useEffect(() => {
    if (!roomId || !profile) return;

    const localLock = isDeviceCheckedInRoom(roomId);
    if (localLock.checkedIn && localLock.studentId && localLock.studentId !== profile.student_id) {
      setDeviceBlockedMsg(`อุปกรณ์นี้ถูกใช้เช็คชื่อให้กับรหัสนิสิต ${localLock.studentId} ในห้องนี้แล้ว`);
    }
  }, [roomId, profile]);

  // 4. Fast-Path Auto Check-in: If token is present and pass exists, trigger immediately!
  useEffect(() => {
    if (profile === undefined || isRoomClosed || deviceBlockedMsg) {
      return;
    }

    if (profile === null) {
      setShowPassCard(true);
      return;
    }

    if (status === 'idle' && errorType === 'none' && !autoCheckInAttempted.current) {
      if (tokenFromUrl) {
        autoCheckInAttempted.current = true;
        submitCheckIn(tokenFromUrl, profile);
      } else {
        setStatus('manual');
      }
    }
  }, [profile, tokenFromUrl, status, errorType, isRoomClosed, deviceBlockedMsg]);

  // 5. Auto-start scanner when switching to scanner mode
  useEffect(() => {
    if (isScanning && !showPinEntry) {
      startScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning, showPinEntry]);

  // 6. Handle pass creation / edit
  const handlePassCreated = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    profileRef.current = newProfile;
    setShowPassCard(false);
    setNotInRosterMsg(null);

    if (status === 'success' || errorType === 'already_checked_in') {
      return;
    }

    if (tokenFromUrl && errorType === 'none' && !isRoomClosed) {
      submitCheckIn(tokenFromUrl, newProfile);
    } else {
      setStatus('manual');
    }
  };

  // 7. Get GPS position (0ms if pre-warmed cache is fresh)
  const getGPSPosition = useCallback((): Promise<{ lat: number; long: number }> => {
    if (cachedGpsRef.current && Date.now() - cachedGpsRef.current.timestamp < 30000) {
      return Promise.resolve({
        lat: cachedGpsRef.current.lat,
        long: cachedGpsRef.current.long,
      });
    }

    if (pendingGpsPromiseRef.current) {
      return pendingGpsPromiseRef.current;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS_NOT_SUPPORTED'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            long: position.coords.longitude,
          };
          cachedGpsRef.current = { ...coords, timestamp: Date.now() };
          resolve(coords);
        },
        () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                lat: position.coords.latitude,
                long: position.coords.longitude,
              };
              cachedGpsRef.current = { ...coords, timestamp: Date.now() };
              resolve(coords);
            },
            (error2) => {
              if (error2.code === 1) {
                reject(new Error('GPS_PERMISSION_DENIED'));
              } else if (error2.code === 2) {
                reject(new Error('GPS_UNAVAILABLE'));
              } else if (error2.code === 3) {
                reject(new Error('GPS_TIMEOUT'));
              } else {
                reject(new Error('GPS_ERROR'));
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 20000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 10000,
        }
      );
    });
  }, []);

  // 8. Submit check-in (Blazing fast in-memory execution)
  const submitCheckIn = async (token: string, studentProfile: StudentProfile) => {
    if (isSubmitting.current || errorType === 'already_checked_in' || isRoomClosed) {
      return;
    }

    const localLock = isDeviceCheckedInRoom(roomId);
    if (localLock.checkedIn && localLock.studentId && localLock.studentId !== studentProfile.student_id) {
      setDeviceBlockedMsg(`อุปกรณ์นี้ถูกใช้เช็คชื่อให้กับรหัสนิสิต ${localLock.studentId} ในห้องนี้แล้ว`);
      return;
    }

    isSubmitting.current = true;
    setDistanceError(null);
    setStatus('checking');
    setMessage('กำลังตรวจสอบตำแหน่งและบันทึกเวลา...');

    try {
      const [fingerprint, position] = await Promise.all([
        getDeviceFingerprint(),
        getGPSPosition(),
      ]);

      const payload = {
        room_id: roomId,
        token: token,
        student_id: studentProfile.student_id,
        student_lat: position.lat,
        student_long: position.long,
        first_name: studentProfile.first_name,
        last_name: studentProfile.last_name,
        year_level: studentProfile.year_level,
        device_fingerprint: fingerprint,
        student_email: studentProfile.email || undefined,
      };

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.room_name) {
          setRoomName(data.room_name);
        }
        markDeviceCheckedInRoom(roomId, studentProfile.student_id);
        setStatus('success');
        setMessage(data.message || 'เช็คชื่อสำเร็จแล้ว!');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 403 && data.code === 'NOT_IN_ROSTER') {
        setNotInRosterMsg(data.error || 'รหัสนิสิตของคุณไม่ได้อยู่ในรายชื่อของวิชานี้');
        setStatus('idle');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 403 && data.code === 'DEVICE_ALREADY_USED') {
        setDeviceBlockedMsg(data.error || 'อุปกรณ์นี้ถูกใช้เช็คชื่อโดยนิสิตท่านอื่นไปแล้ว');
        setStatus('idle');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 403 && data.distance !== undefined) {
        setDistanceError({
          distance: Math.round(data.distance),
          allowedRadius: data.allowed_radius || 50,
        });
        setStatus('idle');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 409 || (data.error && data.error.includes('already checked in'))) {
        setErrorType('already_checked_in');
        setMessage('คุณได้เช็คชื่อวิชานี้เรียบร้อยแล้ว');
        setStatus('idle');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 410) {
        setIsRoomClosed(true);
        setStatus('idle');
        isSubmitting.current = false;
        return;
      }

      if (response.status === 401 || (data.error && data.error.includes('expired token'))) {
        setErrorType('expired_token');
        setStatus('manual');
        isSubmitting.current = false;
        return;
      }

      throw new Error(data.error || 'การเช็คชื่อไม่สำเร็จ');
    } catch (err) {
      isSubmitting.current = false;

      if (err instanceof Error) {
        if (err.message.startsWith('GPS_')) {
          if (err.message === 'GPS_PERMISSION_DENIED') {
            setErrorType('gps_denied');
            setMessage('ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิด Location Service ในการตั้งค่าเบราว์เซอร์หรือมือถือของคุณ');
          } else {
            setStatus('gps_required');
            setMessage(err.message);
          }
          return;
        }
        setStatus('error');
        setMessage(err.message);
      } else {
        setStatus('error');
        setMessage('การเช็คชื่อไม่สำเร็จ');
      }

      setTimeout(() => {
        setStatus('manual');
      }, 3000);
    }
  };

  // 9. QR Scanner
  const startScanner = async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) {
      setShowPassCard(true);
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!scannerDivRef.current) {
      setIsScanning(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await stopScanner();
          try {
            const url = new URL(decodedText);
            const scannedToken = url.searchParams.get('token');
            if (scannedToken) {
              await submitCheckIn(scannedToken, currentProfile);
            } else {
              setMessage('ไม่พบ Token ใน QR Code กรุณาสแกนใหม่');
            }
          } catch {
            if (/^\d{6}$/.test(decodedText.trim())) {
              await submitCheckIn(decodedText.trim(), currentProfile);
            } else {
              setMessage('รูปแบบ QR Code ไม่ถูกต้อง');
            }
          }
        },
        () => {}
      );
    } catch {
      setMessage('กล้องไม่พร้อมใช้งาน หรือไม่ได้รับอนุญาตให้เข้าถึงกล้อง');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = await scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const cooldownInfo = profile ? getPassCooldownStatus(profile.last_updated_at) : null;

  // Global Header with Profile Chip on every screen (Clean, no divider border)
  const renderHeader = () => (
    <div className="px-6 py-6 flex items-center justify-between">
      <h1 className="text-xl font-bold text-black tracking-tight">
        Attndee<span className="text-blue-600">.</span> Pass™
      </h1>

      {profile && (
        <button
          type="button"
          onClick={() => setShowPassCard(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black active:scale-95 transition-all text-xs font-semibold text-gray-800 shadow-xs cursor-pointer"
          title="แก้ไขข้อมูลบัตรนิสิต"
        >
          <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
            {profile.first_name?.[0] || 'U'}
          </div>
          <span className="max-w-[110px] truncate">{profile.first_name}</span>
          <span className="text-blue-600 font-bold underline ml-0.5">แก้ไขบัตร</span>
        </button>
      )}
    </div>
  );

  // Device Blocked Screen (Minimalist Thai)
  if (deviceBlockedMsg) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            อุปกรณ์นี้ถูกใช้เช็คชื่อไปแล้ว
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-8">
            {deviceBlockedMsg}
          </p>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">รหัสห้องเรียน: {roomId}</p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Not in Roster Screen (Strict Roster Lock)
  if (notInRosterMsg) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20 flex-1">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            ไม่พบรหัสในรายชื่อวิชา
          </h2>

          <div className="mb-8">
            <p className="text-base text-red-600 mb-2">
              {notInRosterMsg}
            </p>
            <p className="text-sm text-gray-500">
              หากกรอกรหัสนิสิตผิด สามารถกดปุ่มด้านล่างเพื่อแก้ไขข้อมูลบัตร หรือติดต่ออาจารย์ผู้สอนเพื่อเพิ่มชื่อเข้าชั้นเรียน
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNotInRosterMsg(null);
              setShowPassCard(true);
            }}
            className="w-full max-w-md py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>แก้ไขข้อมูลบัตรนิสิต</span>
          </button>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">รหัสห้องเรียน: {roomId}</p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Room Closed Screen (Minimalist Thai)
  if (isRoomClosed) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            ปิดรับการเช็คชื่อแล้ว
          </h2>
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            ห้องเรียนนี้ปิดรับการเช็คชื่อแล้ว หากคุณมาเข้าเรียนตรงเวลา กรุณาติดต่ออาจารย์ผู้สอนเพื่อเช็คชื่อย้อนหลัง
          </p>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">รหัสห้องเรียน: {roomId}</p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Out of Range Screen (Minimalist Thai)
  if (distanceError) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20 max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">อยู่นอกพื้นที่ห้องเรียน</h2>

          <p className="text-base text-gray-700 leading-relaxed mb-8">
            คุณอยู่ห่างจากห้องเรียน <span className="font-semibold text-black">{distanceError.distance} เมตร</span> (กำหนดไม่เกิน {distanceError.allowedRadius} เมตร)
          </p>

          <button
            onClick={() => {
              setDistanceError(null);
              if (tokenFromUrl && profile) {
                submitCheckIn(tokenFromUrl, profile);
              } else {
                setStatus('manual');
              }
            }}
            className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">รหัสห้องเรียน: {roomId}</p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // GPS Required Screen (Minimalist Thai)
  if (status === 'gps_required') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">จำเป็นต้องใช้ GPS จากสมาร์ทโฟน</h2>

          <p className="text-base text-gray-700 leading-relaxed mb-8">
            กรุณาใช้ <span className="font-semibold">สมาร์ทโฟนที่มีระบบระบุตำแหน่ง GPS</span> ในการเช็คชื่อเข้าห้องเรียน ไม่สามารถตรวจสอบพิกัดจากเครื่องคอมพิวเตอร์ตั้งโต๊ะได้
          </p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <span className="font-semibold">คำแนะนำ:</span> เปิดหน้านี้บนสมาร์ทโฟน และตรวจสอบว่าเปิด Location Access ให้กับเบราว์เซอร์แล้ว
            </p>
          </div>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">รหัสห้องเรียน: {roomId}</p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Success screen (Minimalist Thai)
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20 flex-1">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            เช็คชื่อสำเร็จแล้ว!
          </h2>

          {profile && (
            <div className="mb-8">
              <p className="text-base text-gray-600 mb-1">
                ยินดีต้อนรับ, <span className="font-semibold text-black">{profile.first_name} {profile.last_name}</span>
              </p>
              <p className="text-base text-gray-600 mb-2">
                เข้าสู่ห้องเรียน
              </p>
              <h3 className="text-3xl font-bold text-black leading-tight">
                {roomName || 'ห้องเรียน'}
              </h3>
            </div>
          )}

          <p className="text-base text-gray-600">
            คุณสามารถปิดหน้าต่างนี้ได้เลย
          </p>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            รหัสห้องเรียน: {roomId}
          </p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Already Checked In (Minimalist Thai)
  if (errorType === 'already_checked_in') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20 flex-1">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            คุณได้เช็คชื่อวิชานี้เรียบร้อยแล้ว
          </h2>

          {profile && (
            <div className="mb-8">
              <p className="text-base text-gray-600 mb-1">
                <span className="font-semibold text-black">{profile.first_name} {profile.last_name}</span> ({profile.student_id})
              </p>
              {roomName && (
                <>
                  <p className="text-base text-gray-600 mb-2">
                    ในวิชา
                  </p>
                  <h3 className="text-3xl font-bold text-black leading-tight">
                    {roomName}
                  </h3>
                </>
              )}
            </div>
          )}

          <p className="text-base text-gray-600">
            คุณสามารถปิดหน้าต่างนี้ได้เลย
          </p>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            รหัสห้องเรียน: {roomId}
          </p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Checking state
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20">
          <div className="mb-6">
            <div className="w-20 h-20 border-8 border-gray-200 border-t-black rounded-full animate-spin"></div>
          </div>

          <h2 className="text-2xl font-bold text-black">
            กำลังตรวจสอบตำแหน่งและบันทึกเวลา...
          </h2>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            รหัสห้องเรียน: {roomId}
          </p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (profile === undefined || (profile !== null && !roomName && !tokenFromUrl)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  // Room not found (Minimalist Thai)
  if (errorType === 'expired_token' && roomName === 'ไม่พบห้องเรียน') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="px-6 pt-20">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-black mb-4">
            ไม่พบห้องเรียนนี้
          </h2>
          <p className="text-base text-gray-600 mb-8">
            กรุณาสแกน QR Code ใหม่อีกครั้ง
          </p>
        </div>

        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            รหัสห้องเรียน: {roomId}
          </p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Manual Mode - Show scan/PIN options (Minimalist Thai)
  const currentErrorType = errorType as 'none' | 'already_checked_in' | 'gps_denied' | 'expired_token';
  if (currentErrorType !== 'already_checked_in' && profile && (roomName || !tokenFromUrl) && (!tokenFromUrl || errorType === 'expired_token')) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {renderHeader()}

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
          {/* Profile Card */}
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-black leading-tight">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-gray-600 text-xs mt-0.5 font-mono">
                  {profile.student_id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPassCard(true)}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer active:scale-95 transition-all"
              >
                แก้ไขข้อมูลบัตร
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-1">
                ต้องการเช็คชื่อเข้าวิชา:
              </p>
              <h3 className="text-2xl font-bold text-black leading-tight">
                {roomName || 'ห้องเรียน'}
              </h3>
            </div>
          </div>

          {/* State 1: PIN Entry Mode */}
          {showPinEntry && !isScanning && (
            <div className="w-full max-w-md space-y-4">
              <div>
                <p className="text-sm text-black font-medium mb-3">
                  กรอกรหัส PIN 6 หลักจากหน้าจออาจารย์
                </p>
                <div className="flex gap-2">
                  {pinCode.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        const newPin = [...pinCode];
                        newPin[index] = value;
                        setPinCode(newPin);

                        if (value && index < 5) {
                          const nextInput = document.getElementById(`pin-${index + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !pinCode[index] && index > 0) {
                          const prevInput = document.getElementById(`pin-${index - 1}`);
                          prevInput?.focus();
                        }
                      }}
                      id={`pin-${index}`}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-black bg-white text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all shadow-sm"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  const pin = pinCode.join('');
                  if (pin.length === 6) {
                    submitCheckIn(pin, profile);
                  } else {
                    setMessage('กรุณากรอกรหัส PIN 6 หลักให้ครบถ้วน');
                  }
                }}
                disabled={pinCode.join('').length !== 6 || (status as CheckInStatus) === 'checking'}
                className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl cursor-pointer"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                เช็คชื่อทันที
              </button>

              <p className="text-center text-sm text-gray-500">หรือ</p>

              <button
                onClick={() => {
                  setShowPinEntry(false);
                  setIsScanning(true);
                }}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                สแกน QR Code ด้วยกล้อง
              </button>
            </div>
          )}

          {/* State 2: QR Scanner Mode */}
          {isScanning && !showPinEntry && (
            <div className="w-full max-w-md space-y-3">
              <div
                id="qr-reader"
                ref={scannerDivRef}
                className="rounded-xl overflow-hidden border-2 border-black bg-black"
                style={{ maxHeight: '280px' }}
              />

              <p className="text-center text-sm text-gray-500">หรือ</p>

              <button
                onClick={async () => {
                  await stopScanner();
                  setShowPinEntry(true);
                }}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                กรอกรหัส PIN 6 หลักแทน
              </button>
            </div>
          )}

          {/* State 3: Initial State */}
          {!isScanning && !showPinEntry && (
            <div className="w-full max-w-md space-y-4">
              <button
                onClick={() => setIsScanning(true)}
                className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                สแกน QR Code ด้วยกล้อง
              </button>

              <p className="text-center text-sm text-gray-500">หรือ</p>

              <button
                onClick={() => setShowPinEntry(true)}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                กรอกรหัส PIN 6 หลัก
              </button>
            </div>
          )}

          {errorType === 'expired_token' && (
            <div className="mt-4 max-w-md w-full">
              <p className="text-xs text-red-600 text-center bg-red-50 px-3 py-2 rounded-xl">
                รหัส QR Code นี้หมดอายุแล้ว กรุณาสแกน QR Code ใหม่บนหน้าจอ หรือกรอกรหัส PIN 6 หลัก
              </p>
            </div>
          )}

          {message && errorType === 'none' && (
            <div className="mt-4 max-w-md w-full">
              <p className="text-xs text-red-600 text-center bg-red-50 px-3 py-2 rounded-xl">
                {message}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            รหัสห้องเรียน: {roomId}
          </p>
        </div>

        {showPassCard && (
          <PassCard
            onPassCreated={handlePassCreated}
            onDismiss={profile ? () => setShowPassCard(false) : undefined}
            initialProfile={profile}
          />
        )}
      </div>
    );
  }

  // Main check-in confirmation screen (Minimalist Thai)
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {renderHeader()}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {profile && (
          <>
            <div className="w-full max-w-md mb-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-black leading-tight">
                    {profile.first_name} {profile.last_name}
                  </h2>
                  <p className="text-gray-600 text-sm mt-0.5">
                    {profile.student_id}
                  </p>
                </div>
              </div>

              <div className="mb-12">
                <p className="text-gray-600 text-base mb-2">
                  ต้องการเช็คชื่อเข้าวิชา:
                </p>
                <h3 className="text-4xl font-bold text-black leading-tight">
                  {roomName || 'ห้องเรียน'}
                </h3>
              </div>
            </div>

            {errorType === 'none' ? (
              <button
                onClick={() => {
                  if (tokenFromUrl && profile) {
                    submitCheckIn(tokenFromUrl, profile);
                  } else {
                    setMessage('ไม่พบรหัสเช็คชื่อ กรุณาสแกน QR Code ใหม่อีกครั้ง');
                  }
                }}
                disabled={!tokenFromUrl}
                className="w-full max-w-md py-5 bg-black text-white text-lg font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl cursor-pointer"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                เช็คชื่อทันที
              </button>
            ) : null}

            {errorType === 'gps_denied' && (
              <div className="mt-6 max-w-md w-full">
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิด Location Service ในการตั้งค่าเบราว์เซอร์หรือมือถือของคุณเพื่อเช็คชื่อ
                </p>
              </div>
            )}

            {errorType === 'expired_token' && (
              <div className="mt-6 max-w-md w-full">
                <p className="text-sm text-red-600 text-center bg-red-50 px-4 py-3 rounded-xl">
                  รหัส QR Code นี้หมดอายุแล้ว กรุณาสแกน QR Code ใหม่จากจอของอาจารย์
                </p>
              </div>
            )}

            {message && errorType === 'none' && (
              <div className="mt-6 max-w-md w-full">
                <p className="text-sm text-red-600 text-center bg-red-50 px-4 py-3 rounded-xl">
                  {message}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-6 py-6 text-center">
        <p className="text-xs text-gray-400">
          รหัสห้องเรียน: {roomId}
        </p>
      </div>

      {showPassCard && (
        <PassCard
          onPassCreated={handlePassCreated}
          onDismiss={profile ? () => setShowPassCard(false) : undefined}
          initialProfile={profile}
        />
      )}
    </div>
  );
}
