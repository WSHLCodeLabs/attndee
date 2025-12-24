'use client';

/**
 * Student Check-in View (Phase 2.5)
 * 
 * Purpose: Allow students to check in via QR code with STRICT GPS requirement
 * Features: First-time profile form, auto-submit mode, manual QR scanner, STRICT GPS validation
 * Anti-Cheat: No map fallback - students MUST use mobile devices with GPS
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/utils/supabase';
import PassCard from '@/components/PassCard';

// Mobile debugging with vConsole
if (typeof window !== 'undefined') {
  import('vconsole').then((VConsole) => {
    new VConsole.default();
    console.log('🔍 vConsole initialized for mobile debugging');
  });
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
    
    .animate-slideUp {
      animation: slideUp 0.4s ease-out;
    }
    
    .animate-slideDown {
      animation: slideDown 0.4s ease-out;
    }
    
    .animate-scaleIn {
      animation: scaleIn 0.3s ease-out;
    }
    
    .animate-pulse {
      animation: pulse 2s ease-in-out infinite;
    }
    
    .transition-smooth {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `;
  document.head.appendChild(style);
}

type CheckInStatus = 'idle' | 'profile_setup' | 'checking' | 'success' | 'error' | 'manual' | 'gps_required' | 'already_checked_in';

interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  year_level: number;
}

export default function CheckInPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const tokenFromUrl = searchParams.get('token');

  console.log('🚀 CheckInPage loaded', {
    roomId,
    tokenFromUrl,
    hasToken: !!tokenFromUrl,
    url: typeof window !== 'undefined' ? window.location.href : 'SSR',
  });

  const [status, setStatus] = useState<CheckInStatus>('idle');
  const [message, setMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<StudentProfile | null>(null); // Add ref to track current profile

  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined); // undefined = not loaded yet, null = no profile
  const [showPassCard, setShowPassCard] = useState(false);
  const [roomName, setRoomName] = useState<string>('Check In');
  
  // Submission lock to prevent double submissions
  const isSubmitting = useRef(false);
  
  // New state for PIN entry and error handling
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinCode, setPinCode] = useState(['', '', '', '', '', '']);
  const [errorType, setErrorType] = useState<'none' | 'already_checked_in' | 'gps_denied' | 'expired_token'>('none');
  const [showOptions, setShowOptions] = useState(false); // Show scan/pin options when no token

  /**
   * Load student profile from localStorage (with backward compatibility)
   */
  useEffect(() => {
    console.log('📦 Loading student profile from localStorage');
    
    // Try new key first
    let storedProfile = localStorage.getItem('attndee_pass');
    
    // Backward compatibility: migrate from old key
    if (!storedProfile) {
      const oldProfile = localStorage.getItem('student_profile');
      if (oldProfile) {
        console.log('🔄 Migrating from old student_profile key...');
        localStorage.setItem('attndee_pass', oldProfile);
        localStorage.removeItem('student_profile');
        storedProfile = oldProfile;
      }
    }
    
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as StudentProfile;
        console.log('✅ Profile loaded:', parsed);
        setProfile(parsed);
        profileRef.current = parsed;
      } catch (err) {
        console.error('❌ Failed to parse profile:', err);
        setProfile(null);
      }
    } else {
      console.log('⚠️ No profile found in localStorage');
      setProfile(null);
    }
  }, []);

  /**
   * Sync profile ref with profile state
   */
  useEffect(() => {
    console.log('🔄 Profile changed, updating ref:', profile);
    profileRef.current = profile ?? null;
  }, [profile]);

  /**
   * Fetch room name from Supabase
   */
  useEffect(() => {
    console.log('🏠 Fetching room name for room:', roomId);
    const fetchRoomName = async () => {
      const { data, error } = await supabase
        .from('active_rooms')
        .select('room_name')
        .eq('id', roomId)
        .single();
      
      if (error) {
        console.error('❌ Failed to fetch room name:', error);
        setErrorType('expired_token'); // Room not found or expired
        setRoomName('Room not found');
      } else if (data?.room_name) {
        console.log('✅ Room name fetched:', data.room_name);
        setRoomName(data.room_name);
      } else {
        console.warn('⚠️ No room name found');
        setErrorType('expired_token'); // Room not found
        setRoomName('Room not found');
      }
    };

    fetchRoomName();
  }, [roomId]);

  /**
   * Check if student is already checked in
   */
  useEffect(() => {
    if (!profile || !roomId) return;

    const checkIfAlreadyCheckedIn = async () => {
      console.log('🔍 Checking if student already checked in...', {
        student_id: profile.student_id,
        room_id: roomId,
      });

      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('room_id', roomId)
        .eq('student_id', profile.student_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected if not checked in
        console.error('❌ Error checking attendance:', error);
        return;
      }

      if (data) {
        console.log('🔴 Student already checked in!');
        setErrorType('already_checked_in');
        setMessage("You're already checked in");
      } else {
        console.log('✅ Student not checked in yet');
      }
    };

    checkIfAlreadyCheckedIn();
  }, [profile, roomId]);

  /**
   * Check if profile exists, show PassCard or continue to check-in
   */
  useEffect(() => {
    console.log('🔄 Profile flow useEffect triggered', {
      profile,
      profileIsUndefined: profile === undefined,
      profileIsNull: profile === null,
      tokenFromUrl,
      status,
    });

    // Wait for profile to load
    if (profile === undefined) {
      console.log('⏳ Profile is still loading (undefined), waiting...');
      return;
    }

    // No profile → show PassCard
    if (profile === null) {
      console.log('📝 No profile found, showing PassCard');
      setShowPassCard(true);
      return;
    }

    // Profile exists → proceed with check-in flow
    if (status === 'idle' && errorType === 'none') {
      if (tokenFromUrl) {
        console.log('🚀 Profile exists + token in URL, auto-submitting');
        submitCheckIn(tokenFromUrl, profile);
      } else {
        console.log('📱 Profile exists, no token, showing manual mode');
        setStatus('manual');
      }
    }
  }, [profile, tokenFromUrl, status, errorType]);

  /**
   * Auto-start QR scanner when isScanning becomes true
   */
  useEffect(() => {
    if (isScanning && !showPinEntry) {
      console.log('📷 isScanning is true, starting scanner...');
      startScanner();
    }
    
    return () => {
      // Cleanup when unmounting or switching modes
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          console.log('Scanner cleanup:', err);
        });
      }
    };
  }, [isScanning, showPinEntry]);

  /**
   * Handle pass creation from PassCard
   */
  const handlePassCreated = (newProfile: StudentProfile) => {
    console.log('✅ Pass created:', newProfile);
    setProfile(newProfile);
    profileRef.current = newProfile;
    setShowPassCard(false);

    // After creating pass, always go to manual mode (user needs to scan QR again)
    console.log('📱 Pass created, switching to manual mode');
    setStatus('manual');
  };

  /**
   * STRICT GPS Check with Fallback Strategy for Speed
   */
  const getGPSPosition = (): Promise<{ lat: number; long: number }> => {
    console.log('🛰️ getGPSPosition called');
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        reject(new Error('GPS_NOT_SUPPORTED'));
        return;
      }

      console.log('✅ Trying high accuracy GPS first...');

      // Try 1: High accuracy with short timeout
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ GPS success (high accuracy):', {
            lat: position.coords.latitude,
            long: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          resolve({
            lat: position.coords.latitude,
            long: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('⚠️ High accuracy failed, trying network location...', error.code);
          
          // Try 2: Fallback to network/WiFi location
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ GPS success (network):', {
                lat: position.coords.latitude,
                long: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
              resolve({
                lat: position.coords.latitude,
                long: position.coords.longitude,
              });
            },
            (error2) => {
              console.error('❌ GPS failed (both attempts):', {
                code: error2.code,
                message: error2.message,
              });
              
              // STRICT: Reject all GPS errors (no fallback for students)
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
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 30000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 3000, // Short timeout for first attempt
          maximumAge: 10000,
        }
      );
    });
  };

  /**
   * Submit check-in to backend API (with strict GPS requirement)
   */
  const submitCheckIn = async (token: string, studentProfile: StudentProfile) => {
    console.log('📍 submitCheckIn called', { token, studentProfile, roomId });
    
    // Prevent double submissions
    if (isSubmitting.current) {
      console.log('🛑 Already submitting, ignoring duplicate call');
      return;
    }
    
    // Early return if already checked in
    if (errorType === 'already_checked_in') {
      console.log('🛑 User already checked in, aborting submit');
      return;
    }
    
    isSubmitting.current = true; // Lock
    
    setStatus('checking');
    setMessage('Checking status...');

    // Check if already checked in BEFORE getting GPS
    console.log('🔍 Checking if already checked in before proceeding...');
    const { data: existingCheck, error: checkError } = await supabase
      .from('attendance')
      .select('id')
      .eq('room_id', roomId)
      .eq('student_id', studentProfile.student_id)
      .single();

    if (existingCheck) {
      console.log('🔴 Student already checked in!');
      setErrorType('already_checked_in');
      setMessage("You're already checked in");
      setStatus('idle');
      isSubmitting.current = false; // Unlock
      return;
    }

    setMessage('Getting your location...');

    try {
      console.log('🌐 Requesting GPS position...');
      // STRICT GPS check - will throw error if GPS unavailable
      const position = await getGPSPosition();
      console.log('✅ GPS position obtained:', position);

      setMessage('Submitting check-in...');

      const payload = {
        room_id: roomId,
        token: token,
        student_id: studentProfile.student_id,
        student_lat: position.lat,
        student_long: position.long,
        first_name: studentProfile.first_name,
        last_name: studentProfile.last_name,
        year_level: studentProfile.year_level,
      };
      
      console.log('📤 Sending check-in request:', payload);

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log('📊 Response data:', data);

      if (response.ok) {
        console.log('✅ Check-in successful!');
        setStatus('success');
        setMessage(data.message || 'Check-in successful!');
        isSubmitting.current = false; // Unlock on success
      } else {
        console.error('❌ Check-in failed:', data.error);
        
        // Check for duplicate check-in
        if (data.error && data.error.includes('already checked in')) {
          console.log('🔴 Duplicate check-in detected');
          setErrorType('already_checked_in');
          setMessage("You're already checked in");
          // Don't set status - let the dedicated page show
          isSubmitting.current = false; // Unlock
          return;
        }
        
        // Check for expired token error (but don't override if already checked in)
        if (data.error && (data.error.includes('Invalid or expired token') || data.error.includes('expired token'))) {
          console.log('🔴 Token expired - checking if already checked in first');
          // Only set expired_token if not already checked in
          const currentErrorType = errorType as 'none' | 'already_checked_in' | 'gps_denied' | 'expired_token';
          if (currentErrorType !== 'already_checked_in') {
            console.log('🔴 Setting expired token and switching to manual mode');
            setErrorType('expired_token');
            setStatus('manual'); // Set to manual, not idle (to avoid triggering useEffect loop)
          } else {
            console.log('✅ User already checked in, staying on that page');
          }
          isSubmitting.current = false; // Unlock
          return;
        }
        
        throw new Error(data.error || 'Check-in failed');
      }
    } catch (err) {
      console.error('💥 Error in submitCheckIn:', err);
      isSubmitting.current = false; // Unlock on error
      
      // Handle GPS-specific errors
      if (err instanceof Error) {
        console.log('Error type:', err.message);
        if (err.message.startsWith('GPS_')) {
          console.log('🚫 GPS error detected');
          
          // Set appropriate error type based on GPS error
          if (err.message === 'GPS_PERMISSION_DENIED') {
            setErrorType('gps_denied');
            setMessage('Location permission denied. Please enable location access in your device settings.');
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
        setMessage('Check-in failed');
      }

      setTimeout(() => {
        console.log('⏱️ Switching to manual mode after error');
        setStatus('manual');
      }, 3000);
    }
  };

  /**
   * Start QR code scanner
   */
  const startScanner = async () => {
    console.log('📷 startScanner called');
    console.log('🔍 Profile state:', profile);
    console.log('🔍 Profile ref:', profileRef.current);
    console.log('🔍 isScanning:', isScanning);
    
    const localStorageProfile = localStorage.getItem('student_profile');
    console.log('🔍 localStorage profile RAW:', localStorageProfile);

    let currentProfile = profileRef.current;

    // Emergency: Try to reload from localStorage if profile is null
    if (!currentProfile && localStorageProfile) {
      console.warn('⚠️ Profile is null but localStorage has data! Attempting emergency reload...');
      try {
        const parsed = JSON.parse(localStorageProfile) as StudentProfile;
        console.log('✅ Emergency profile reload successful:', parsed);
        currentProfile = parsed;
        setProfile(parsed);
        profileRef.current = parsed;
      } catch (err) {
        console.error('❌ Emergency profile reload failed:', err);
      }
    }

    if (!currentProfile) {
      console.error('❌ Cannot start scanner: No profile in ref');
      console.error('Profile state:', profile);
      console.error('ProfileRef:', profileRef.current);
      console.error('localStorage:', localStorageProfile);
      alert('Error: Please set up your profile first. Refresh the page and fill in your information.');
      return;
    }

    console.log('✅ Profile found:', currentProfile);
    setIsScanning(true);
    console.log('✅ Scanner state set to scanning');

    // Wait for React to render the div
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!scannerDivRef.current) {
      console.error('❌ Scanner div not found after delay');
      setIsScanning(false);
      return;
    }

    try {
      console.log('🎥 Initializing Html5Qrcode...');
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      console.log('✅ Html5Qrcode initialized');

      console.log('📸 Starting camera...');
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          console.log('✅ QR Code scanned!', decodedText);
          await stopScanner();

          try {
            console.log('🔍 Parsing QR URL...');
            const url = new URL(decodedText);
            const scannedToken = url.searchParams.get('token');

            if (scannedToken) {
              console.log('✅ Token extracted from QR:', scannedToken);
              await submitCheckIn(scannedToken, currentProfile);
            } else {
              console.error('❌ No token in QR code');
              setMessage('Invalid QR code: No token found');
            }
          } catch (parseErr) {
            console.error('❌ Failed to parse QR code:', parseErr);
            setMessage('Invalid QR code format');
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (too verbose)
        }
      );
      console.log('✅ Camera started successfully');
    } catch (err) {
      console.error('❌ Failed to start scanner:', err);
      setMessage('Camera access denied or unavailable');
      setIsScanning(false);
    }
  };

  /**
   * Stop QR code scanner safely
   */
  const stopScanner = async () => {
    console.log('🛑 stopScanner called', {
      scannerExists: !!scannerRef.current,
    });

    if (scannerRef.current) {
      try {
        console.log('⏹️ Attempting to stop scanner...');
        // Try to get state, if it fails, scanner isn't properly initialized
        try {
          const state = await scannerRef.current.getState();
          console.log('Scanner state:', state);
          // Only stop if scanner is scanning or paused (not transitioning)
          if (state === 2 || state === 3) {
            await scannerRef.current.stop();
            console.log('✅ Scanner stopped successfully');
          }
        } catch (stateErr) {
          console.log('⚠️ Could not get scanner state, forcing cleanup');
        }
        
        // Always clear and null the ref
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          console.log('⚠️ Could not clear scanner');
        }
        scannerRef.current = null;
        console.log('✅ Scanner cleanup complete');
      } catch (err) {
        console.error('❌ Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  /**
   * Cleanup scanner on unmount
   */
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // GPS Required Screen (Anti-Cheat) - Standardized
  if (status === 'gps_required') {
    return (
      <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Top-Left Aligned */}
        <div className="px-6 pt-20">
          {/* GPS Icon - Consistent with other pages */}
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

          {/* Heading */}
          <h2 className="text-3xl font-bold text-black mb-4">GPS Required</h2>

          {/* Message */}
          <p className="text-base text-gray-700 leading-relaxed mb-8">
            Please use a <span className="font-semibold">mobile phone with GPS</span> to check in.
            Desktop computers cannot verify your location.
          </p>

          {/* Tip Box */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">
              💡 <span className="font-semibold">Tip:</span> Open this page on your smartphone and make sure location services are enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Top-Left Aligned */}
        <div className="px-6 pt-20">
          {/* Success Icon - Circle Checkmark */}
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

          {/* Success Message */}
          <h2 className="text-3xl font-bold text-black mb-4">
            Success!
          </h2>

          {/* Welcome Message */}
          {profile && (
            <div className="mb-8">
              <p className="text-base text-gray-600 mb-1">
                Welcome, <span className="font-semibold">{profile.first_name}</span>
              </p>
              <p className="text-base text-gray-600 mb-2">
                to
              </p>
              <h3 className="text-3xl font-bold text-black leading-tight">
                {roomName}
              </h3>
            </div>
          )}

          {/* Close Instruction */}
          <p className="text-base text-gray-600">
            You can now close this tab
          </p>
        </div>

        {/* Footer - Room ID */}
        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        </div>
      </div>
    );
  }

  // Already Checked In - Show dedicated page
  if (errorType === 'already_checked_in') {
    return (
      <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Top-Left Aligned */}
        <div className="px-6 pt-20 animate-slideUp">
          {/* Checkmark Icon - Same as Success */}
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

          {/* Already Checked In Message */}
          <h2 className="text-3xl font-bold text-black mb-4">
            You're already checked in
          </h2>

          {/* Room Name */}
          {roomName && profile && (
            <div className="mb-8">
              <p className="text-base text-gray-600 mb-1">
                <span className="font-semibold">{profile.first_name} {profile.last_name}</span>
              </p>
              <p className="text-base text-gray-600 mb-2">
                in
              </p>
              <h3 className="text-3xl font-bold text-black leading-tight">
                {roomName}
              </h3>
            </div>
          )}

          {/* Close Instruction */}
          <p className="text-base text-gray-600">
            You can now close this tab
          </p>
        </div>

        {/* Footer - Room ID */}
        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        </div>
      </div>
    );
  }

  // Checking state - Getting location or submitting check-in
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Top-Left Aligned */}
        <div className="px-6 pt-20">
          {/* Large Curved Spinner */}
          <div className="mb-6">
            <div className="w-20 h-20 border-8 border-gray-200 border-t-black rounded-full animate-spin"></div>
          </div>

          {/* Status Text */}
          <h2 className="text-2xl font-bold text-black">
            Getting you check in...
          </h2>
        </div>

        {/* Footer - Room ID */}
        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        </div>
      </div>
    );
  }

  // Loading state - show only while data is still loading (not null, but undefined)
  if (profile === undefined || (profile !== null && !roomName)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {/* Simple Spinner - No Text */}
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  // Room not found / Expired - Show clean error page
  if (errorType === 'expired_token' && roomName === 'Room not found') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Top-Left Aligned */}
        <div className="px-6 pt-20">
          {/* Error Icon - Circle X */}
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

          {/* Error Message */}
          <h2 className="text-3xl font-bold text-black mb-4">
            Room not found
          </h2>
          <p className="text-base text-gray-600 mb-8">
            Please scan the QR code again
          </p>
        </div>

        {/* Footer - Room ID */}
        <div className="px-6 py-6 mt-auto text-center">
          <p className="text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        </div>
      </div>
    );
  }

  // Manual Mode - Show scan/PIN options (but NOT if already checked in)
  const currentErrorType = errorType as 'none' | 'already_checked_in' | 'gps_denied' | 'expired_token';
  if (currentErrorType !== 'already_checked_in' && profile && roomName && (!tokenFromUrl || errorType === 'expired_token')) {
    return (
      <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span> Pass™
          </h1>
        </div>

        {/* Main Content - Centered, Compact */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
          {/* Profile Card - Compact */}
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              {/* Avatar Circle - Smaller */}
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

              {/* Profile Info - Compact */}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-black leading-tight">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-gray-600 text-xs mt-0.5">
                  {profile.student_id}
                </p>
              </div>
            </div>

            {/* Check-in Info - Compact */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-1">
                Wants to check in:
              </p>
              <h3 className="text-2xl font-bold text-black leading-tight">
                {roomName}
              </h3>
            </div>
          </div>

          {/* State 1: PIN Entry Mode */}
          {showPinEntry && !isScanning && (
            <div className="w-full max-w-md space-y-4 animate-slideUp" style={{ minHeight: 'auto' }}>
              {/* PIN Input Label */}
              <div>
                <p className="text-sm text-black font-medium mb-3">
                  Enter a pin manually
                </p>
                {/* 6-Box PIN Input - Left Aligned */}
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
                        
                        // Auto-focus next box
                        if (value && index < 5) {
                          const nextInput = document.getElementById(`pin-${index + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace to go to previous box
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

              {/* Check in Now Button */}
              <button
                onClick={() => {
                  const pin = pinCode.join('');
                  if (pin.length === 6) {
                    // Use PIN as TOTP token
                    submitCheckIn(pin, profile);
                  } else {
                    setMessage('Please enter a 6-digit PIN');
                  }
                }}
                disabled={pinCode.join('').length !== 6 || (status as CheckInStatus) === 'checking'}
                className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
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
                Check in now
              </button>

              <p className="text-center text-sm text-gray-500">OR</p>

              {/* Scan QR Code Button */}
              <button
                onClick={() => {
                  setShowPinEntry(false);
                  setIsScanning(true);
                  // Scanner will auto-start from useEffect
                }}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan QR Code
              </button>
            </div>
          )}

          {/* State 2: QR Scanner Mode - Compact */}
          {isScanning && !showPinEntry && (
            <div className="w-full max-w-md space-y-3 animate-slideUp" style={{ minHeight: 'auto' }}>
              {/* QR Scanner */}
              <div
                id="qr-reader"
                ref={scannerDivRef}
                className="rounded-xl overflow-hidden border-2 border-black bg-black"
                style={{ minHeight: '300px' }}
              />
              <p className="text-center text-xs text-white bg-black py-1.5 rounded-lg -mt-2">
                Align the QR Code in the frame
              </p>

              <p className="text-center text-xs text-gray-500">OR</p>

              {/* Enter PIN Button - Compact */}
              <button
                onClick={async () => {
                  await stopScanner();
                  setIsScanning(false);
                  setShowPinEntry(true);
                }}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all"
              >
                Enter a pin manually
              </button>
            </div>
          )}

          {/* State 3: Default View - Show both options - Compact */}
          {!showPinEntry && !isScanning && (
            <div className="w-full max-w-md space-y-2 animate-slideUp">
              <button
                onClick={() => setIsScanning(true)}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan QR Code
              </button>

              <p className="text-center text-xs text-gray-500">OR</p>

              <button
                onClick={() => setShowPinEntry(true)}
                className="w-full py-3 bg-white text-black text-sm font-semibold rounded-full border-2 border-gray-300 hover:border-black active:scale-95 transition-all"
              >
                Enter a pin manually
              </button>
            </div>
          )}
        </div>

        {/* Footer - Room ID */}
        <div className="px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            Room ID: {roomId}
          </p>
        </div>
      </div>
    );
  }

  // Main check-in confirmation screen (new minimal design)
  return (
    <div className="min-h-screen bg-white flex flex-col animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-black">
          Attndee<span className="text-blue-600">.</span> Pass™
        </h1>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {profile && roomName && (
          <>
            {/* Profile Card */}
            <div className="w-full max-w-md mb-12 animate-slideUp">
              <div className="flex items-center gap-4 mb-8">
                {/* Avatar Circle */}
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

                {/* Profile Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-black leading-tight">
                    {profile.first_name} {profile.last_name}
                  </h2>
                  <p className="text-gray-600 text-sm mt-0.5">
                    {profile.student_id}
                  </p>
                </div>
              </div>

              {/* Check-in Info */}
              <div className="mb-12">
                <p className="text-gray-600 text-base mb-2">
                  Wants to check in:
                </p>
                <h3 className="text-4xl font-bold text-black leading-tight">
                  {roomName}
                </h3>
              </div>
            </div>

            {/* Check In Button - Hidden if errors */}
            {errorType === 'none' ? (
              <button
                onClick={() => {
                  if (tokenFromUrl && profile) {
                    submitCheckIn(tokenFromUrl, profile);
                  } else {
                    setMessage('Missing token. Please scan QR code again.');
                  }
                }}
                disabled={!tokenFromUrl}
                className="w-full max-w-md py-5 bg-black text-white text-lg font-semibold rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 animate-scaleIn shadow-lg hover:shadow-xl"
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
                Check in now
              </button>
            ) : null}


            {/* Error Messages */}
            {errorType === 'gps_denied' && (
              <div className="mt-6 max-w-md w-full animate-slideUp">
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  Location permission denied. Please enable location access in your device settings to check in.
                </p>
              </div>
            )}
            
            {errorType === 'expired_token' && (
              <div className="mt-6 max-w-md w-full">
                <p className="text-sm text-red-600 text-center bg-red-50 px-4 py-3 rounded-xl">
                  This QR code has expired. Please ask your teacher for a new one.
                </p>
              </div>
            )}
            
            {/* General error message */}
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

      {/* Footer - Room ID */}
      <div className="px-6 py-6 text-center">
        <p className="text-xs text-gray-400">
          Room ID: {roomId}
        </p>
      </div>

      {/* Attndee. Pass™ Card - Show when no profile exists */}
      {showPassCard && <PassCard onPassCreated={handlePassCreated} />}
    </div>
  );
}
