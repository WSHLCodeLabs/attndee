'use client';

/**
 * Teacher Room Dashboard (Attndee.)
 *
 * - Left Card: Soft blue rounded card (#c2ccff) with:
 *   1. Large QR Code wrapped in a synchronized 30s countdown border ring around the QR box
 *   2. 6-digit PIN ("000 000") positioned directly beneath the QR box
 *   3. Picture-in-Picture (PiP) support for Desktop & iPadOS
 * - Right Column:
 *   1. Top "stat" card (Remaining time + Present/Absent counts derived directly from attendanceList)
 *   2. Bottom "namelist" card with instant Student ID search + Quick Score Buttons (0, 0.5, 1.0)
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, ActiveRoom, Attendance, KURosterStudent, StudentListJson } from '@/utils/supabase';
import { downloadUpdatedXlsx, parseSpreadsheetBuffer } from '@/utils/xlsx-helper';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Shuffle, PictureInPicture2, Search, X, FileSpreadsheet } from 'lucide-react';
import Loader from '@/components/Loader';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronized TOTP state
  const [totpToken, setTotpToken] = useState('000000');
  const [totpCountdown, setTotpCountdown] = useState(30);
  const [totpProgress, setTotpProgress] = useState(100); // 0..100%
  const [qrUrl, setQrUrl] = useState('');
  const lastStepRef = useRef<number>(-1);

  // Synchronized Room Countdown state
  const [timeRemaining, setTimeRemaining] = useState('00:00');
  const [sessionProgress, setSessionProgress] = useState(100); // 0..100%
  const [checkinClosed, setCheckinClosed] = useState(false);

  // Picture-in-Picture (PiP) state & refs
  const [isPipActive, setIsPipActive] = useState(false);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const qrImageRef = useRef<HTMLImageElement | null>(null);
  const qrSvgContainerRef = useRef<HTMLDivElement | null>(null);

  // Attendance state (single source of truth — no separate count state that can drift)
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  // Track students given 0.5 score (student_id -> true)
  const [halfScoreIds, setHalfScoreIds] = useState<Record<string, boolean>>({});

  // Spotlight state
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightName, setSpotlightName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);

  // Namelist tab & quick search state
  const [activeTab, setActiveTab] = useState<'present' | 'absent'>('present');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const templateFileInputRef = useRef<HTMLInputElement | null>(null);

  // Room title marquee state (auto-scrolls & loops only when title overflows container)
  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const titleMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

  const rosterStudents: KURosterStudent[] = useMemo(
    () => room?.student_list_json?.roster_students || [],
    [room]
  );

  // Map of checked-in student_id -> Attendance record
  const checkedInMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const a of attendanceList) {
      map.set(a.student_id.trim(), a);
    }
    return map;
  }, [attendanceList]);

  const checkedInIdSet = useMemo(() => new Set(checkedInMap.keys()), [checkedInMap]);

  const absentStudents = useMemo(
    () => rosterStudents.filter((s) => !checkedInIdSet.has(s.student_id.trim())),
    [rosterStudents, checkedInIdSet]
  );

  const extraStudents = useMemo(() => {
    if (rosterStudents.length === 0) return [];
    const extrasInRoster = rosterStudents.filter((s) => s.status === 'Extra');
    const rosterIdSet = new Set(rosterStudents.map((s) => s.student_id.trim()));
    const unlistedCheckedIn = attendanceList.filter((a) => !rosterIdSet.has(a.student_id.trim()));

    const combinedMap = new Map<string, { student_id: string; first_name: string; last_name: string; checkin_time?: string }>();
    for (const s of extrasInRoster) {
      combinedMap.set(s.student_id.trim(), {
        student_id: s.student_id.trim(),
        first_name: s.first_name,
        last_name: s.last_name,
      });
    }
    for (const a of unlistedCheckedIn) {
      combinedMap.set(a.student_id.trim(), {
        student_id: a.student_id.trim(),
        first_name: a.first_name,
        last_name: a.last_name,
        checkin_time: a.checkin_time,
      });
    }
    return Array.from(combinedMap.values());
  }, [rosterStudents, attendanceList]);

  // Accurate counts derived directly from state
  const presentCount = attendanceList.length;

  // Format 6-digit token as "000 000"
  const formattedPin = useMemo(() => {
    const clean = (totpToken || '000000').padEnd(6, '0');
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`;
  }, [totpToken]);

  // Load saved 0.5 scores from localStorage on mount
  useEffect(() => {
    if (!roomId) return;
    try {
      const savedHalf = localStorage.getItem(`attndee_room_half_${roomId}`);
      if (savedHalf) {
        setHalfScoreIds(JSON.parse(savedHalf));
      }
    } catch {}
  }, [roomId]);

  // Detect whether the room title overflows its header container
  useEffect(() => {
    const checkOverflow = () => {
      const container = titleContainerRef.current;
      const measure = titleMeasureRef.current;
      if (!container || !measure) return;
      setIsTitleOverflowing(measure.scrollWidth > container.clientWidth + 2);
    };

    checkOverflow();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkOverflow) : null;
    if (observer && titleContainerRef.current) {
      observer.observe(titleContainerRef.current);
    }
    window.addEventListener('resize', checkOverflow);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [room?.room_name, checkinClosed, isLoading]);

  const updateHalfScore = (studentId: string, isHalf: boolean) => {
    setHalfScoreIds((prev) => {
      const next = { ...prev };
      if (isHalf) {
        next[studentId] = true;
      } else {
        delete next[studentId];
      }
      try {
        localStorage.setItem(`attndee_room_half_${roomId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Helper: Draw rounded rectangle on Canvas 2D
  const fillRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fillStyle: string
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  };

  // Render the Blue QR + PIN Card onto Offscreen PiP Canvas
  const drawPipCardToCanvas = useCallback(
    (pinText: string, progressPct: number, isClosed: boolean) => {
      const canvas = pipCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width; // 720
      const H = canvas.height; // 860

      // 1. Soft Periwinkle-Blue Card Background (#c2ccff)
      ctx.clearRect(0, 0, W, H);
      fillRoundedRect(ctx, 0, 0, W, H, 0, '#c2ccff');

      // 2. Outer Progress Ring Box + Inner White QR Square
      const boxX = 56;
      const boxY = 48;
      const boxSize = 608;

      if (!isClosed) {
        // Draw progress ring background
        fillRoundedRect(ctx, boxX - 8, boxY - 8, boxSize + 16, boxSize + 16, 48, 'rgba(255,255,255,0.45)');

        // Draw conic progress border around QR box
        ctx.save();
        ctx.beginPath();
        const cx = boxX + boxSize / 2;
        const cy = boxY + boxSize / 2;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * Math.max(0, Math.min(100, progressPct))) / 100;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, boxSize, startAngle, endAngle, false);
        ctx.closePath();
        ctx.clip();
        fillRoundedRect(ctx, boxX - 8, boxY - 8, boxSize + 16, boxSize + 16, 48, '#0051fc');
        ctx.restore();
      }

      // Inner white rounded square
      fillRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 42, '#ffffff');

      if (!isClosed) {
        if (qrImageRef.current && qrImageRef.current.complete) {
          ctx.drawImage(qrImageRef.current, boxX + 36, boxY + 36, boxSize - 72, boxSize - 72);
        }
      } else {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ปิดรับการเช็คชื่อแล้ว', W / 2, boxY + boxSize / 2);
      }

      // 3. 6-Digit PIN directly below the QR box
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 104px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isClosed ? '--- ---' : pinText, W / 2, 760);
    },
    []
  );

  // Rasterize QRCodeSVG only when qrUrl changes
  useEffect(() => {
    if (!qrUrl || !qrSvgContainerRef.current) return;

    const svgEl = qrSvgContainerRef.current.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);
    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      qrImageRef.current = img;
      URL.revokeObjectURL(url);
      drawPipCardToCanvas(formattedPin, totpProgress, checkinClosed);
    };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrUrl]);

  useEffect(() => {
    drawPipCardToCanvas(formattedPin, totpProgress, checkinClosed);
  }, [formattedPin, totpProgress, checkinClosed, drawPipCardToCanvas]);

  // Toggle Picture-in-Picture
  const handleTogglePiP = async () => {
    const video = pipVideoRef.current;
    const canvas = pipCanvasRef.current;
    if (!video || !canvas) return;

    try {
      const isWebkitPip = (video as any).webkitPresentationMode === 'picture-in-picture';
      if (document.pictureInPictureElement || isWebkitPip) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if ((video as any).webkitSetPresentationMode) {
          (video as any).webkitSetPresentationMode('inline');
        }
        setIsPipActive(false);
        return;
      }

      drawPipCardToCanvas(formattedPin, totpProgress, checkinClosed);

      if (!video.srcObject) {
        const stream =
          typeof canvas.captureStream === 'function'
            ? canvas.captureStream(15)
            : (canvas as any).webkitCaptureStream?.(15);
        if (stream) {
          video.srcObject = stream;
        }
      }

      await video.play();

      if (typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      } else if (
        typeof (video as any).webkitSupportsPresentationMode === 'function' &&
        (video as any).webkitSupportsPresentationMode('picture-in-picture')
      ) {
        (video as any).webkitSetPresentationMode('picture-in-picture');
        setIsPipActive(true);
      }
    } catch (err) {
      console.error('PiP toggle error:', err);
    }
  };

  useEffect(() => {
    const video = pipVideoRef.current;
    if (!video) return;

    const handleLeavePip = () => setIsPipActive(false);
    const handleEnterPip = () => setIsPipActive(true);
    const handleWebkitModeChange = () => {
      const mode = (video as any).webkitPresentationMode;
      setIsPipActive(mode === 'picture-in-picture');
    };

    video.addEventListener('leavepictureinpicture', handleLeavePip);
    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('webkitpresentationmodechanged', handleWebkitModeChange);

    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('webkitpresentationmodechanged', handleWebkitModeChange);
    };
  }, []);

  // 1. Fetch room on mount
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('active_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        if (!data) throw new Error('ไม่พบห้องเช็คชื่อนี้');

        let localRosterJson = data.student_list_json || null;
        try {
          const rawStored = localStorage.getItem(`attndee_room_roster_${roomId}`);
          if (rawStored) {
            localRosterJson = JSON.parse(rawStored);
          }
        } catch (storageErr) {
          console.warn('Failed to parse local room roster:', storageErr);
        }

        const hydratedRoom: ActiveRoom = {
          ...data,
          student_list_json: localRosterJson,
        };

        setRoom(hydratedRoom);

        if (localRosterJson) {
          fetch('/api/checkin', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_id: roomId,
              is_closed: Boolean(localRosterJson.is_closed),
              roster_students: localRosterJson.roster_students || [],
              radius_meters: localRosterJson.radius_meters || 50,
            }),
          }).catch(() => {});
        }

        const createdAt = new Date(data.created_at).getTime();
        const durationMs = data.checkin_duration_mins * 60 * 1000;
        const now = Date.now();

        if (localRosterJson?.is_closed === true || now >= createdAt + durationMs) {
          setCheckinClosed(true);
          setTimeRemaining('00:00');
          setSessionProgress(0);
          if ((localRosterJson?.roster_students?.length ?? 0) > 0) {
            setActiveTab('absent');
          }
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลห้องเช็คชื่อได้');
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  // 2. Fetch & subscribe to live attendance
  useEffect(() => {
    if (!room) return;

    const fetchAttendance = async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('room_id', roomId)
        .order('checkin_time', { ascending: false });

      if (data) {
        // Deduplicate by student_id
        const uniqueMap = new Map<string, Attendance>();
        for (const item of data) {
          const key = item.student_id.trim();
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }
        setAttendanceList(Array.from(uniqueMap.values()));
      }
    };

    fetchAttendance();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAttendance = payload.new as Attendance;
            setAttendanceList((prev) => {
              if (prev.some((a) => a.student_id.trim() === newAttendance.student_id.trim())) {
                return prev;
              }
              return [newAttendance, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setAttendanceList((prev) => prev.filter((a) => a.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, roomId]);

  // 3. Unified, 100% Synchronized Timer Loop (both 30s TOTP Ring & Room Session Countdown)
  useEffect(() => {
    if (!room || checkinClosed) return;

    const createdAtMs = new Date(room.created_at).getTime();
    const totalDurationMs = room.checkin_duration_mins * 60 * 1000;
    const expiryMs = createdAtMs + totalDurationMs;

    const tick = () => {
      const nowMs = Date.now();
      const elapsedSessionMs = Math.max(0, nowMs - createdAtMs);

      // --- A. 30-Second TOTP Cycle (100% synchronized with room createdAtMs & countdown timer) ---
      const stepWindowMs = 30000;
      const currentStep = Math.floor(elapsedSessionMs / stepWindowMs);
      const elapsedInStepMs = elapsedSessionMs % stepWindowMs;
      const remainingInStepMs = stepWindowMs - elapsedInStepMs;

      if (currentStep !== lastStepRef.current) {
        lastStepRef.current = currentStep;
        try {
          authenticator.options = {
            step: 30,
            epoch: elapsedSessionMs,
          };
          const token = authenticator.generate(room.secret_key);
          setTotpToken(token);
          setQrUrl(`${window.location.origin}/checkin/${roomId}?token=${token}`);
        } catch (err) {
          console.error('TOTP generation error:', err);
        }
      }

      setTotpCountdown(Math.ceil(remainingInStepMs / 1000));
      setTotpProgress((remainingInStepMs / stepWindowMs) * 100);

      // --- B. Overall Class Check-in Countdown ---
      const remainingSessionMs = expiryMs - nowMs;
      if (remainingSessionMs <= 0) {
        setCheckinClosed(true);
        setTimeRemaining('00:00');
        setSessionProgress(0);
        if (rosterStudents.length > 0) {
          setActiveTab('absent');
        }
        const updatedJson = {
          ...(room.student_list_json || {}),
          is_closed: true,
        };
        try {
          localStorage.setItem(`attndee_room_roster_${roomId}`, JSON.stringify(updatedJson));
        } catch {}
        fetch('/api/checkin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, is_closed: true }),
        }).catch(() => {});
        return;
      }

      const totalSecs = Math.ceil(remainingSessionMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setTimeRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setSessionProgress(Math.max(0, Math.min(100, (remainingSessionMs / totalDurationMs) * 100)));
    };

    tick();
    const timerId = setInterval(tick, 50); // 20fps smooth ring & bar sync
    return () => clearInterval(timerId);
  }, [room, roomId, checkinClosed, rosterStudents.length]);

  const handleEndSessionNow = async () => {
    setCheckinClosed(true);
    setTimeRemaining('00:00');
    setSessionProgress(0);
    if (rosterStudents.length > 0) {
      setActiveTab('absent');
    }
    if (room) {
      const updatedJson = {
        ...(room.student_list_json || {}),
        is_closed: true,
      };
      try {
        localStorage.setItem(`attndee_room_roster_${roomId}`, JSON.stringify(updatedJson));
      } catch {}
      await fetch('/api/checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, is_closed: true }),
      }).catch(() => {});
    }
  };

  /**
   * Persist updated roster students across LocalStorage, Supabase active_rooms, and runtime memory
   */
  const persistUpdatedRoster = async (newRosterStudents: KURosterStudent[]) => {
    if (!room) return;
    const updatedJson: StudentListJson = {
      ...(room.student_list_json || {}),
      roster_students: newRosterStudents,
    };

    setRoom((prev) => (prev ? { ...prev, student_list_json: updatedJson } : null));

    try {
      localStorage.setItem(`attndee_room_roster_${roomId}`, JSON.stringify(updatedJson));
    } catch {}

    fetch('/api/checkin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        roster_students: newRosterStudents,
      }),
    }).catch(() => {});

    await supabase
      .from('active_rooms')
      .update({ student_list_json: updatedJson })
      .eq('id', roomId);
  };

  /**
   * Quick Score Action (0, 0.5, 1.0) for any student
   */
  const handleSetStudentScore = async (
    student: {
      student_id: string;
      first_name: string;
      last_name: string;
    },
    score: 0 | 0.5 | 1
  ) => {
    if (!room) return;
    const cleanId = student.student_id.trim();
    setUpdatingStudentId(cleanId);

    try {
      // If room has an Excel roster, make sure any added/managed student is enrolled in rosterStudents
      if (rosterStudents.length > 0) {
        const isAlreadyInRoster = rosterStudents.some(
          (s) => s.student_id.trim() === cleanId
        );
        if (!isAlreadyInRoster) {
          const newRosterStudent: KURosterStudent = {
            row_index: rosterStudents.length + 1,
            student_id: cleanId,
            name_th: `${student.first_name} ${student.last_name}`.trim(),
            first_name: student.first_name || cleanId,
            last_name: student.last_name || '-',
            status: 'Extra',
          };
          const updatedRoster = [...rosterStudents, newRosterStudent];
          await persistUpdatedRoster(updatedRoster);
        }
      }

      if (score === 0) {
        // Remove attendance if checked in
        updateHalfScore(cleanId, false);
        setAttendanceList((prev) => prev.filter((a) => a.student_id.trim() !== cleanId));
        await supabase
          .from('attendance')
          .delete()
          .eq('room_id', roomId)
          .eq('student_id', cleanId);
      } else {
        // Score is 0.5 or 1.0 -> ensure student is checked in
        updateHalfScore(cleanId, score === 0.5);

        if (!checkedInIdSet.has(cleanId)) {
          const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room_id: roomId,
              token: 'MANUAL_OVERRIDE',
              student_id: cleanId,
              student_lat: room.teacher_lat,
              student_long: room.teacher_long,
              first_name: student.first_name || cleanId,
              last_name: student.last_name || '-',
              year_level: 1,
              is_manual_override: true,
            }),
          });

          if (response.ok) {
            setAttendanceList((prev) => {
              if (prev.some((a) => a.student_id.trim() === cleanId)) return prev;
              const next: Attendance = {
                id: `manual-${cleanId}-${Date.now()}`,
                room_id: roomId,
                student_id: cleanId,
                first_name: student.first_name || cleanId,
                last_name: student.last_name || '-',
                year_level: 1,
                student_lat: room.teacher_lat,
                student_long: room.teacher_long,
                checkin_time: new Date().toISOString(),
              };
              return [next, ...prev];
            });
          }
        }
      }
    } catch (err) {
      console.error('Quick score update failed:', err);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Search results matching Student ID or Name across both roster and checked-in list
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const combinedMap = new Map<
      string,
      { student_id: string; first_name: string; last_name: string; display_name: string }
    >();

    for (const s of rosterStudents) {
      const id = s.student_id.trim();
      combinedMap.set(id, {
        student_id: id,
        first_name: s.first_name,
        last_name: s.last_name,
        display_name: s.name_th || `${s.first_name} ${s.last_name}`.trim(),
      });
    }

    for (const a of attendanceList) {
      const id = a.student_id.trim();
      if (!combinedMap.has(id)) {
        combinedMap.set(id, {
          student_id: id,
          first_name: a.first_name,
          last_name: a.last_name,
          display_name: `${a.first_name} ${a.last_name}`.trim(),
        });
      }
    }

    return Array.from(combinedMap.values()).filter(
      (item) =>
        item.student_id.toLowerCase().includes(q) ||
        item.display_name.toLowerCase().includes(q)
    );
  }, [searchQuery, rosterStudents, attendanceList]);

  const handleSpotlight = () => {
    if (attendanceList.length === 0) return;

    setShowSpotlight(true);
    setIsSpinning(true);

    let counter = 0;
    const maxCycles = 25;
    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * attendanceList.length);
      const randomStudent = attendanceList[randomIndex];
      setSpotlightName(`${randomStudent.first_name} ${randomStudent.last_name}`);
      counter++;

      if (counter >= maxCycles) {
        clearInterval(spinInterval);
        const finalIndex = Math.floor(Math.random() * attendanceList.length);
        const winner = attendanceList[finalIndex];
        setSpotlightName(`${winner.first_name} ${winner.last_name}`);
        setIsSpinning(false);
      }
    }, 80);
  };

  const handleExportCSV = () => {
    if (attendanceList.length === 0) return;

    const headers = ['Student ID', 'First Name', 'Last Name', 'Score', 'Check-in Time'];
    const rows = attendanceList.map((a) => {
      const id = a.student_id.trim();
      const score = halfScoreIds[id] ? 0.5 : 1;
      return [
        id,
        a.first_name,
        a.last_name,
        score.toString(),
        new Date(a.checkin_time).toLocaleString('th-TH'),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `${room?.room_name.replace(/\s+/g, '_')}_attendance_${
      new Date().toISOString().split('T')[0]
    }.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = async (overrideBase64?: string) => {
    if (!room?.student_list_json?.xlsx_data) {
      handleExportCSV();
      return;
    }

    const { xlsx_data, xlsx_base64, id_column, filename, course_meta } = room.student_list_json;

    // Resolve the original .xlsx binary so KU logo, TH SarabunPSK fonts, borders, and B2 layout are 100% preserved
    let resolvedBase64 = typeof overrideBase64 === 'string' ? overrideBase64 : xlsx_base64;
    if (!resolvedBase64) {
      try {
        resolvedBase64 = localStorage.getItem('attndee_latest_xlsx_base64') || undefined;
      } catch {}
    }

    // If this room was created before the binary-preserving update, prompt the user once to pick their original .xlsx template
    if (!resolvedBase64 && templateFileInputRef.current) {
      templateFileInputRef.current.click();
      return;
    }

    let latestFingerprints: Record<string, string> = {};
    for (const s of rosterStudents) {
      if (s.student_id && s.device_fingerprint && s.device_fingerprint !== 'unknown') {
        latestFingerprints[s.student_id.trim()] = s.device_fingerprint;
      }
    }
    try {
      const res = await fetch(`/api/checkin?room_id=${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const runtimeData = await res.json();
        if (runtimeData.student_fingerprints) {
          latestFingerprints = {
            ...latestFingerprints,
            ...runtimeData.student_fingerprints,
          };
        }
      }
    } catch {}

    const lateSet = new Set(Object.keys(halfScoreIds).filter((id) => halfScoreIds[id]));

    downloadUpdatedXlsx({
      xlsxData: xlsx_data,
      xlsxBase64: resolvedBase64,
      courseMeta: course_meta,
      idColumn: id_column,
      checkedInIds: checkedInIdSet,
      lateIds: lateSet,
      lateScore: 0.5,
      extraStudents: extraStudents.map((s) => ({
        student_id: s.student_id,
        first_name: s.first_name,
        last_name: s.last_name,
        checkin_time: s.checkin_time,
      })),
      studentFingerprints: latestFingerprints,
      filename: filename || `${room.room_name}_checked.xlsx`,
      dateLabel: new Date().toLocaleDateString('th-TH'),
    });
  };

  const handleTemplateFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheetBuffer(buffer, 'array');
        if (parsed.xlsxBase64) {
          const updatedJson = {
            ...(room.student_list_json || {}),
            xlsx_data: parsed.rawGrid,
            xlsx_base64: parsed.xlsxBase64,
            id_column: parsed.selectedIdColumn,
            course_meta: parsed.courseMeta,
            roster_students: parsed.students,
            filename: file.name,
          };
          setRoom({
            ...room,
            student_list_json: updatedJson,
          });
          try {
            localStorage.setItem(`attndee_room_roster_${roomId}`, JSON.stringify(updatedJson));
            localStorage.setItem('attndee_latest_xlsx_base64', parsed.xlsxBase64);
          } catch {}
          handleExportXLSX(parsed.xlsxBase64);
        }
      } catch (err) {
        console.error('Failed to read template xlsx:', err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDeleteAndExit = async () => {
    if (!confirm('ต้องการปิดและลบห้องเช็คชื่อนี้ใช่หรือไม่?')) return;
    try {
      localStorage.removeItem(`attndee_room_roster_${roomId}`);
      localStorage.removeItem(`attndee_room_half_${roomId}`);
    } catch {}
    await supabase.from('active_rooms').delete().eq('id', roomId);
    router.push('/');
  };

  // Render Quick Score Pill Buttons (0 | 0.5 | 1.0) for a student
  const renderQuickScoreButtons = (student: {
    student_id: string;
    first_name: string;
    last_name: string;
  }) => {
    const cleanId = student.student_id.trim();
    const isCheckedIn = checkedInIdSet.has(cleanId);
    const isHalf = Boolean(halfScoreIds[cleanId]);
    const currentScore: 0 | 0.5 | 1 = !isCheckedIn ? 0 : isHalf ? 0.5 : 1;
    const isBusy = updatingStudentId === cleanId;

    return (
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {([0, 0.5, 1] as const).map((scoreVal) => {
          const isActive = currentScore === scoreVal;
          const label = scoreVal === 1 ? '1.0' : scoreVal.toString();

          let activeStyle = 'bg-neutral-900 text-white border-neutral-900';
          if (scoreVal === 1 && isActive) {
            activeStyle = 'bg-[#0051fc] text-white border-[#0051fc] shadow-xs';
          } else if (scoreVal === 0.5 && isActive) {
            activeStyle = 'bg-[#6ea0f5] text-white border-[#3b78e7] shadow-xs';
          }

          return (
            <button
              key={scoreVal}
              type="button"
              disabled={isBusy}
              onClick={() => handleSetStudentScore(student, scoreVal)}
              className={`min-w-[48px] sm:min-w-[56px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer tabular-nums ${
                isActive
                  ? activeStyle
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-black mb-3">ไม่พบห้องเช็คชื่อ</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-[#0051fc] text-white font-bold rounded-full text-sm"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  if (showSpotlight) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative">
        <button
          onClick={() => setShowSpotlight(false)}
          className="absolute top-8 right-8 text-white text-4xl hover:opacity-75 cursor-pointer"
        >
          ×
        </button>
        <div className="text-center">
          <p className="text-white/70 text-xl font-medium mb-6 uppercase tracking-widest">
            {isSpinning ? 'กำลังสุ่มรายชื่อ...' : 'ผู้โชคดีได้แก่'}
          </p>
          <h1
            className={`text-white text-5xl sm:text-7xl font-bold tracking-tight transition-all duration-100 ${
              isSpinning ? 'blur-xs scale-95' : 'blur-0 scale-100'
            }`}
          >
            {spotlightName}
          </h1>
        </div>
        {!isSpinning && (
          <button
            onClick={() => setShowSpotlight(false)}
            className="mt-12 px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-black transition-all cursor-pointer"
          >
            กลับสู่หน้าห้องเช็คชื่อ
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-white flex flex-col lg:overflow-hidden">
      {/* Hidden Offscreen Canvas & Video for Picture-in-Picture (Desktop & iPadOS) */}
      <canvas
        ref={pipCanvasRef}
        width={720}
        height={860}
        className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0"
      />
      <video
        ref={pipVideoRef}
        muted
        playsInline
        className="fixed -left-[9999px] -top-[9999px] w-px h-px pointer-events-none opacity-0"
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto px-5 sm:px-8 lg:px-12 py-5 sm:py-6 flex flex-col lg:grid lg:grid-cols-12 gap-5 lg:gap-8 min-h-0">
        {/* ============================================================
            LEFT COLUMN (5 cols on Desktop): Logo + Blue QR/PIN Card
        ============================================================ */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          {/* Top-Left Header: Attndee. */}
          <div className="flex items-center justify-between h-12 flex-shrink-0">
            <Link
              href="/"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black select-none leading-none"
            >
              Attndee<span className="text-[#0051fc]">.</span>
            </Link>
          </div>

          {/* Soft Periwinkle-Blue Card (#c2ccff) */}
          <div className="relative flex-1 bg-[#c2ccff] rounded-[32px] p-6 sm:p-8 xl:p-10 flex flex-col items-center justify-center gap-6 min-h-0 shadow-sm">
            {/* Large QR Box with Animated 30s Countdown Ring Around It */}
            <div
              className="w-full max-w-[480px] xl:max-w-[510px] aspect-square p-2 rounded-[34px] shadow-sm transition-none"
              style={
                !checkinClosed
                  ? {
                      background: `conic-gradient(from 0deg, #0051fc 0%, #0051fc ${totpProgress}%, rgba(255,255,255,0.45) ${totpProgress}%, rgba(255,255,255,0.45) 100%)`,
                    }
                  : { background: '#ffffff' }
              }
            >
              <div className="w-full h-full bg-white rounded-[28px] p-6 sm:p-8 xl:p-9 flex flex-col items-center justify-center relative overflow-hidden">
                {!checkinClosed && qrUrl ? (
                  <div
                    ref={qrSvgContainerRef}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <QRCodeSVG
                      value={qrUrl}
                      size={460}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <p className="text-3xl sm:text-4xl font-extrabold text-black mb-3">
                      ปิดรับการเช็คชื่อแล้ว
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-sm mx-auto">
                      สามารถค้นหารหัสนิสิตเพื่อเช็คชื่อย้อนหลัง (0 / 0.5 / 1.0) หรือกด Export XLSX ได้ทางด้านขวา
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 6-Digit PIN ("000 000") positioned directly below QR box */}
            <div className="w-full max-w-[480px] xl:max-w-[510px] flex items-center justify-center relative pt-1 flex-shrink-0">
              <p className="text-6xl sm:text-7xl xl:text-[76px] font-black text-black tracking-[0.08em] tabular-nums leading-none select-all">
                {checkinClosed ? '--- ---' : formattedPin}
              </p>

              {!checkinClosed && (
                <button
                  type="button"
                  onClick={handleTogglePiP}
                  className={`absolute right-0 p-3.5 rounded-2xl transition-all cursor-pointer ${
                    isPipActive
                      ? 'bg-[#0051fc] text-white shadow-md'
                      : 'bg-white/80 hover:bg-white text-black shadow-xs hover:scale-105 active:scale-95'
                  }`}
                  title={
                    isPipActive
                      ? 'ปิดหน้าต่างลอย (Exit Picture-in-Picture)'
                      : 'แยกกรอบ QR ลอยทับหน้าจอ (Picture-in-Picture)'
                  }
                  aria-label="Picture-in-Picture"
                >
                  <PictureInPicture2 size={24} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN (7 cols on Desktop): Header + Stat Card + Namelist Card
        ============================================================ */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-h-0">
          {/* Top-Right Header: classroomName (auto-scrolling marquee when long) + Red "จบการเช็คชื่อ" button */}
          <div className="flex items-center justify-between gap-4 min-h-[48px] flex-shrink-0">
            <div
              ref={titleContainerRef}
              className={`relative flex-1 min-w-0 overflow-hidden ${
                isTitleOverflowing ? 'marquee-fade-mask' : ''
              }`}
              title={room?.room_name || 'ห้องเช็คชื่อ'}
            >
              {/* Hidden single-line span used to measure true text width */}
              <span
                ref={titleMeasureRef}
                aria-hidden="true"
                className="invisible absolute left-0 top-0 whitespace-nowrap pointer-events-none text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight"
              >
                {room?.room_name || 'ห้องเช็คชื่อ'}
              </span>

              {isTitleOverflowing ? (
                <div className="animate-attndee-marquee">
                  <span className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-black tracking-tight whitespace-nowrap pr-12">
                    {room?.room_name || 'ห้องเช็คชื่อ'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-black tracking-tight whitespace-nowrap pr-12"
                  >
                    {room?.room_name || 'ห้องเช็คชื่อ'}
                  </span>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-black tracking-tight whitespace-nowrap truncate">
                  {room?.room_name || 'ห้องเช็คชื่อ'}
                </h1>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Hidden file input to attach original .xlsx template if room was created before binary preservation */}
              <input
                ref={templateFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleTemplateFileSelected}
                className="hidden"
              />
              {!checkinClosed ? (
                <button
                  type="button"
                  onClick={handleEndSessionNow}
                  className="px-6 py-3 bg-[#ff0000] hover:bg-red-700 active:scale-95 text-white text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  จบการเช็คชื่อ
                </button>
              ) : (
                <>
                  {room?.student_list_json?.xlsx_data ? (
                    <button
                      type="button"
                      onClick={() => handleExportXLSX()}
                      className="px-6 py-3 bg-[#0051fc] hover:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:scale-102 active:scale-98"
                    >
                      <Download size={18} />
                      <span>Export XLSX</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={attendanceList.length === 0}
                      className="px-6 py-3 bg-[#0051fc] hover:bg-blue-700 text-white text-sm sm:text-base font-bold rounded-xl transition-all disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer shadow-xs"
                    >
                      Download CSV
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDeleteAndExit}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-black text-sm sm:text-base font-bold rounded-xl transition-colors cursor-pointer"
                    title="ปิดและลบห้องเช็คชื่อ"
                  >
                    ออก
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TOP RIGHT BOX: "stat" Card */}
          <div className="bg-[#f4f6f8] rounded-[28px] px-7 sm:px-9 py-6 sm:py-7 flex flex-col justify-between gap-4 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 items-center">
              {/* Stat 1: Time Remaining */}
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  {checkinClosed ? 'สถานะการเช็คชื่อ' : 'เวลาที่เหลือ'}
                </p>
                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tabular-nums leading-none">
                  {checkinClosed ? 'ปิดแล้ว' : timeRemaining}
                </p>
              </div>

              {/* Stat 2: Present Count (Derived directly from attendanceList.length) */}
              <div>
                <p className="text-xs sm:text-sm font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                  เช็คชื่อแล้ว
                </p>
                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0051fc] tabular-nums leading-none">
                  {rosterStudents.length > 0
                    ? `${presentCount}/${rosterStudents.length}`
                    : `${presentCount} คน`}
                </p>
              </div>

              {/* Stat 3: Absent Count */}
              <div className="col-span-2 sm:col-span-1 flex sm:flex-col items-center sm:items-end justify-between">
                {rosterStudents.length > 0 ? (
                  <div className="sm:text-right">
                    <p className="text-xs sm:text-sm font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                      ยังไม่เช็คชื่อ
                    </p>
                    <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tabular-nums leading-none">
                      {absentStudents.length}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSpotlight}
                    disabled={attendanceList.length === 0}
                    className="px-5 py-3 bg-white border border-gray-200 hover:border-black rounded-xl text-sm font-bold text-black flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    <Shuffle size={16} />
                    <span>สุ่มชื่อนิสิต</span>
                  </button>
                )}
              </div>
            </div>

            {/* Synchronized Session Countdown Progress Bar */}
            {!checkinClosed && (
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-black rounded-full transition-all duration-150"
                  style={{ width: `${sessionProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* BOTTOM RIGHT BOX: "namelist" Card */}
          <div className="flex-1 bg-[#f4f6f8] rounded-[28px] p-6 sm:p-7 flex flex-col min-h-[360px] lg:min-h-0 overflow-hidden">
            {/* Large Quick Search Bar for Student ID / Name */}
            <div className="relative mb-4 flex-shrink-0">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์รหัสนิสิต หรือ ชื่อนิสิต เพื่อเช็คชื่อ / ให้คะแนน (0, 0.5, 1.0)..."
                className="w-full pl-12 pr-11 py-4 bg-white border border-gray-200 focus:border-black rounded-2xl text-base sm:text-lg text-black placeholder:text-gray-400 focus:outline-none transition-colors shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCustomStudentName('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black cursor-pointer"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Tabs & Spotlight Bar (shown when not searching) */}
            {!searchQuery.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-gray-200/80 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('present')}
                    className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                      activeTab === 'present'
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:text-black'
                    }`}
                  >
                    เช็คชื่อแล้ว ({presentCount})
                  </button>

                  {rosterStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('absent')}
                      className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                        activeTab === 'absent'
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white text-gray-600 hover:text-black'
                      }`}
                    >
                      ยังไม่เช็คชื่อ ({absentStudents.length})
                    </button>
                  )}
                </div>

                {attendanceList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSpotlight}
                    className="px-4 py-2.5 bg-white hover:bg-gray-100 text-black text-sm font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Shuffle size={16} />
                    <span>สุ่มชื่อ</span>
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Student List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
              {searchQuery.trim() ? (
                /* SEARCH MODE: Instant Student ID / Name Matches + Quick Score Buttons */
                searchResults.length > 0 ? (
                  searchResults.map((student) => (
                    <div
                      key={student.student_id}
                      className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between gap-4 border border-gray-100 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-black text-base sm:text-lg truncate">
                            {student.display_name}
                          </p>
                          {rosterStudents.find((s) => s.student_id.trim() === student.student_id.trim())?.status === 'Extra' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex-shrink-0">
                              นอกรายชื่อ
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">
                          {student.student_id}
                        </p>
                      </div>

                      {renderQuickScoreButtons(student)}
                    </div>
                  ))
                ) : (
                  /* Unlisted Student Quick Add with 0.5 / 1.0 buttons */
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-black">
                          ไม่พบรหัส <span className="font-mono text-[#0051fc]">{searchQuery.trim()}</span> ในใบรายชื่อ
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          กรอกชื่อ-นามสกุล แล้วกดเลือกคะแนนเพื่อเช็คชื่อเพิ่มได้ทันที
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        placeholder="ชื่อ-นามสกุล นิสิต (เว้นว่างได้)"
                        className="flex-1 min-w-[200px] px-4 py-3 border border-gray-300 rounded-xl text-sm sm:text-base text-black focus:outline-none focus:border-black"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const parts = customStudentName.trim().split(/\s+/);
                            await handleSetStudentScore(
                              {
                                student_id: searchQuery.trim(),
                                first_name: parts[0] || searchQuery.trim(),
                                last_name: parts.slice(1).join(' ') || '-',
                              },
                              0.5
                            );
                            setSearchQuery('');
                            setCustomStudentName('');
                          }}
                          className="px-4 py-2.5 bg-[#6ea0f5] hover:bg-blue-500 text-white text-sm font-bold rounded-xl cursor-pointer"
                        >
                          + ให้ 0.5
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const parts = customStudentName.trim().split(/\s+/);
                            await handleSetStudentScore(
                              {
                                student_id: searchQuery.trim(),
                                first_name: parts[0] || searchQuery.trim(),
                                last_name: parts.slice(1).join(' ') || '-',
                              },
                              1
                            );
                            setSearchQuery('');
                            setCustomStudentName('');
                          }}
                          className="px-4 py-2.5 bg-[#0051fc] hover:bg-blue-700 text-white text-sm font-bold rounded-xl cursor-pointer"
                        >
                          + ให้ 1.0
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : activeTab === 'present' ? (
                /* PRESENT TAB */
                attendanceList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-12">
                    <p className="text-gray-400 text-sm sm:text-base font-medium">
                      กำลังรอให้นิสิตสแกน QR Code เช็คชื่อ...
                    </p>
                  </div>
                ) : (
                  attendanceList.map((attendance, idx) => {
                    const rosterMatch = rosterStudents.find(
                      (s) => s.student_id.trim() === attendance.student_id.trim()
                    );
                    const fullName =
                      rosterMatch?.name_th ||
                      `${attendance.first_name} ${attendance.last_name}`.trim();

                    return (
                      <div
                        key={attendance.id}
                        className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between gap-4 border border-gray-100 shadow-2xs"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-sm sm:text-base font-mono text-gray-400 w-7 text-center flex-shrink-0">
                            {attendanceList.length - idx}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-black text-base sm:text-lg truncate">
                                {fullName}
                              </p>
                              {(rosterMatch?.status === 'Extra' || (!rosterMatch && rosterStudents.length > 0)) && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex-shrink-0">
                                  นอกรายชื่อ
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-mono">
                              <span>{attendance.student_id}</span>
                              <span>•</span>
                              <span>
                                {new Date(attendance.checkin_time).toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {renderQuickScoreButtons({
                          student_id: attendance.student_id,
                          first_name: attendance.first_name,
                          last_name: attendance.last_name,
                        })}
                      </div>
                    );
                  })
                )
              ) : absentStudents.length === 0 ? (
                /* ABSENT TAB (Empty) */
                <div className="h-full flex items-center justify-center text-center py-12">
                  <p className="text-gray-500 text-sm sm:text-base font-semibold">
                    นิสิตเช็คชื่อครบทุกคนแล้ว!
                  </p>
                </div>
              ) : (
                /* ABSENT TAB (List with 0 | 0.5 | 1.0 Quick Score Buttons) */
                absentStudents.map((student) => (
                  <div
                    key={student.student_id}
                    className="bg-white rounded-2xl px-6 py-4 flex items-center justify-between gap-4 border border-gray-100 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-black text-base sm:text-lg truncate">
                          {student.name_th || `${student.first_name} ${student.last_name}`}
                        </p>
                        {student.status === 'Extra' && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex-shrink-0">
                            นอกรายชื่อ
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-mono">
                        {student.student_id}
                      </p>
                    </div>

                    {renderQuickScoreButtons(student)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
