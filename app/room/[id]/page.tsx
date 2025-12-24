'use client';

/**
 * Teacher Room View (Attndee) - Redesigned
 * 
 * Purpose: Clean, streamlined room view with timer, QR code, and live attendance
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, ActiveRoom, Attendance } from '@/utils/supabase';
import { authenticator } from 'otplib';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft } from 'lucide-react';
import Loader from '@/components/Loader';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<ActiveRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [checkinClosed, setCheckinClosed] = useState(false);
  const [totpCountdown, setTotpCountdown] = useState(30); // TOTP refresh countdown
  const [totpProgress, setTotpProgress] = useState(1); // Progress from 1 (full) to 0 (empty)
  
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightName, setSpotlightName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('active_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (fetchError) throw new Error(fetchError.message);
        if (!data) throw new Error('Room not found');

        setRoom(data);

        const createdAt = new Date(data.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

        if (diffMinutes > data.checkin_duration_mins) {
          setCheckinClosed(true);
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (!room) return;

    const fetchAttendance = async () => {
      console.log('📊 Fetching attendance for room:', roomId);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('room_id', roomId)
        .order('checkin_time', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch attendance:', error);
      } else if (data) {
        console.log('✅ Attendance fetched:', data.length, 'records');
        setAttendanceList(data);
        setAttendanceCount(data.length);
      }
    };

    fetchAttendance();

    console.log('📡 Setting up real-time subscription for room:', roomId);

    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        console.log('🔔 Real-time event received!', payload);
        const newAttendance = payload.new as Attendance;
        console.log('✅ New attendance:', newAttendance);
        setAttendanceList((prev) => [...prev, newAttendance]);
        setAttendanceCount((prev) => prev + 1);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time channel');
      supabase.removeChannel(channel);
    };
  }, [room, roomId]);

  useEffect(() => {
    if (!room || checkinClosed) return;

    const updateTokenAndCountdown = () => {
      try {
        // Use standard TOTP with default Unix epoch
        authenticator.options = { 
          step: 30
        };
        
        // Generate token
        const token = authenticator.generate(room.secret_key);
        setTotpToken(token);
        const origin = window.location.origin;
        const url = `${origin}/checkin/${roomId}?token=${token}`;
        setQrUrl(url);
        
        // Calculate countdown (standard 30s windows from Unix epoch)
        const nowMs = Date.now();
        const nowSec = Math.floor(nowMs / 1000);
        const remaining = 30 - (nowSec % 30);
        setTotpCountdown(remaining);
      } catch (err) {
        console.error('TOTP generation error:', err);
      }
    };

    // Smooth progress update using requestAnimationFrame
    let animationFrameId: number;
    const updateProgress = () => {
      const nowMs = Date.now();
      const nowSec = Math.floor(nowMs / 1000);
      const remaining = 30 - (nowSec % 30);
      
      // Calculate precise progress with milliseconds for smooth animation
      const msIntoCurrentSecond = nowMs % 1000;
      const preciseRemaining = remaining - (msIntoCurrentSecond / 1000);
      const progress = preciseRemaining / 30; // 1.0 at start, 0.0 at end
      setTotpProgress(Math.max(0, Math.min(1, progress)));
      
      // Continue animation loop
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    // Initial update
    updateTokenAndCountdown();
    updateProgress();
    
    // Update token every second
    const interval = setInterval(updateTokenAndCountdown, 1000);
    
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [room, roomId, checkinClosed]);

  useEffect(() => {
    if (!room || checkinClosed) return;

    const updateCountdown = () => {
      const createdAt = new Date(room.created_at);
      const expiryTime = new Date(createdAt.getTime() + room.checkin_duration_mins * 60 * 1000);
      const now = new Date();
      const remainingMs = expiryTime.getTime() - now.getTime();

      if (remainingMs <= 0) {
        setCheckinClosed(true);
        setTimeRemaining('0:00');
        // Delete room from database when time expires
        deleteRoom();
        return;
      }

      const minutes = Math.floor(remainingMs / 1000 / 60);
      const seconds = Math.floor((remainingMs / 1000) % 60);
      setTimeRemaining(`${minutes}:${String(seconds).padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [room, checkinClosed]);

  const handleSpotlight = () => {
    if (attendanceList.length === 0) {
      alert('No students have checked in yet!');
      return;
    }

    setIsSpinning(true);
    setShowSpotlight(true);

    let spinCount = 0;
    const spinInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * attendanceList.length);
      const student = attendanceList[randomIndex];
      setSpotlightName(`${student.first_name} ${student.last_name}`);
      spinCount++;

      if (spinCount > 20) {
        clearInterval(spinInterval);
        setIsSpinning(false);
      }
    }, 100);
  };

  const handleExportCSV = () => {
    if (attendanceList.length === 0) {
      alert('No attendance data to export!');
      return;
    }

    const headers = ['Student ID', 'First Name', 'Last Name', 'Year Level', 'Check-in Time'];
    const rows = attendanceList.map((a) => [
      a.student_id,
      a.first_name,
      a.last_name,
      a.year_level.toString(),
      new Date(a.checkin_time).toLocaleString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${roomId}_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Delete room from database
   */
  const deleteRoom = async () => {
    try {
      console.log('🗑️ Deleting room from database:', roomId);
      const { data, error } = await supabase
        .from('active_rooms')
        .delete()
        .eq('id', roomId)
        .select(); // Add select to see what was deleted
      
      if (error) {
        console.error('❌ Failed to delete room:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert(`Failed to delete room: ${error.message}`);
        throw error;
      } else {
        console.log('✅ Room deleted successfully');
        console.log('Deleted data:', data);
      }
    } catch (err) {
      console.error('💥 Error deleting room:', err);
      throw err;
    }
  };

  const handleCloseRoom = async () => {
    if (!confirm('Are you sure you want to close this room?')) return;
    
    await deleteRoom();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="text-lg font-light text-gray-600 mt-4">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-light mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (showSpotlight) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative">
        <button
          onClick={() => setShowSpotlight(false)}
          className="absolute top-8 right-8 text-white text-4xl hover:opacity-75"
        >
          ×
        </button>
        <div className="text-center">
          <p className="text-white text-2xl font-light mb-8 uppercase tracking-wide">
            {isSpinning ? 'Selecting...' : 'Selected Student'}
          </p>
          <h1 className={`text-white text-7xl md:text-8xl font-extralight tracking-tight transition-all duration-100 ${isSpinning ? 'blur-sm' : 'blur-0'}`}>
            {spotlightName}
          </h1>
        </div>
        {!isSpinning && (
          <button
            onClick={() => setShowSpotlight(false)}
            className="mt-12 px-8 py-3 border-2 border-white text-white rounded-full hover:bg-white hover:text-black transition-all"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  // Check-in Closed - Full screen view
  if (checkinClosed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-center justify-center py-16">
            {/* Barrier Icon */}
            <div className="w-40 h-40 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center mb-8 shadow-lg">
              <span className="text-7xl">🚧</span>
            </div>

            {/* Room Name & Title */}
            <p className="text-base text-gray-600 mb-2">{room?.room_name}</p>
            <h2 className="text-5xl font-bold text-black mb-8">Check-in Closed</h2>

            {/* Total Attendee Box */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl px-12 py-8 mb-8 w-full max-w-md">
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium text-black">Total Attendee</p>
                <p className="text-6xl font-bold text-black">{attendanceCount}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-md">
              <button
                onClick={handleSpotlight}
                disabled={attendanceList.length === 0}
                className="flex-1 py-4 bg-purple-600 text-white text-base font-semibold rounded-xl hover:bg-purple-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                🎯 Spotlight
              </button>
              <button
                onClick={handleExportCSV}
                disabled={attendanceList.length === 0}
                className="flex-1 py-4 bg-gray-200 text-black text-base font-semibold rounded-xl hover:bg-gray-300 transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Download CSV
              </button>
              <button
                onClick={handleCloseRoom}
                className="px-6 py-4 bg-red-600 text-white text-xl font-bold rounded-xl hover:bg-red-700 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to leave? This room will be closed and deleted.')) {
                await deleteRoom();
                router.push('/');
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-xl font-medium text-black absolute left-1/2 transform -translate-x-1/2">
            {room?.room_name || 'Room'}
          </h1>
          <div className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span>
          </div>
        </div>
      </div>

      {/* Main Content - Redesigned with Scrollable List */}
      <div className="flex-1 h-[calc(100vh-73px)] px-16 py-10 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* LEFT: Large QR Code */}
          <div className="flex flex-col justify-center items-center">
            {qrUrl && (
              <div className="w-full max-w-[650px]">
                {/* QR Code Container with Animated Square Border */}
                <div className="relative p-1 rounded-3xl" style={{
                  background: `conic-gradient(from 0deg, #0051fc 0%, #0051fc ${totpProgress * 100}%, #e5e7eb ${totpProgress * 100}%, #e5e7eb 100%)`,
                  transition: 'none' // Smooth update via state changes
                }}>
                  {/* QR Code */}
                  <div className="bg-white rounded-3xl p-10 flex items-center justify-center shadow-lg">
                    <QRCodeSVG
                      value={qrUrl}
                      size={550}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                
                {/* Current Token */}
                <div className="text-center mt-8">
                  <p className="text-base text-gray-500 mb-3 font-medium uppercase tracking-wide text-xs">Current Token</p>
                  <p className="text-5xl font-mono font-bold text-black tracking-[0.25em]">{totpToken}</p>
                  <p className="text-sm text-gray-500 mt-2">Refreshes in <span className="font-mono font-semibold text-[#0051fc]">{totpCountdown}s</span></p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Stats, List, and Info */}
          <div className="flex flex-col h-full">
            {/* TOP: Timer and Attendance Stats */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Timer Section */}
              <div>
                <p className="text-lg font-semibold text-black mb-3 tracking-tight">Check-in closes in</p>
                <p className="text-6xl font-bold text-black tabular-nums leading-none tracking-tight">{timeRemaining}</p>
              </div>

              {/* Live Attendance Section */}
              <div>
                <p className="text-lg font-semibold text-black mb-3 tracking-tight">Live Attendance</p>
                <p className="text-6xl font-bold text-black tabular-nums leading-none tracking-tight">{attendanceCount}</p>
              </div>
            </div>

            {/* MIDDLE: Scrollable Attendee List */}
            <div className="flex-1 bg-white border-2 border-gray-200 rounded-2xl overflow-hidden mb-6">
              {attendanceList.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <p className="text-gray-400 text-base">Waiting for students to check in...</p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <div className="divide-y divide-gray-100">
                    {attendanceList.map((attendance) => (
                      <div key={attendance.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-black text-sm">
                              {attendance.first_name} {attendance.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Year {attendance.year_level} • {attendance.student_id}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(attendance.checkin_time).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM: Room Info */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 font-medium text-center">
                Room ID: <span className="font-mono text-black">{roomId}</span>
                <span className="mx-3">•</span>
                Duration: <span className="text-black">{room?.checkin_duration_mins} min</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
