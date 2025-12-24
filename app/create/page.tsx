'use client';

/**
 * Create Room Page - Attndee
 * 
 * Purpose: Dedicated form page for setting up a new class/session
 * Features: Room name input, duration selector, interactive map with GPS pin
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import dynamic from 'next/dynamic';
import { MapPin, LocateFixed, ArrowLeft } from 'lucide-react';

// Dynamic imports for react-leaflet (SSR-safe)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export default function CreateRoomPage() {
  const router = useRouter();
  
  // Form state
  const [roomName, setRoomName] = useState('');
  const [checkinDuration, setCheckinDuration] = useState(15);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([13.7563, 100.5018]);
  const [mapKey, setMapKey] = useState(0);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasGPS, setHasGPS] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingTip, setLoadingTip] = useState('Requesting location permission...');

  /**
   * Generate secret key for TOTP
   */
  const generateSecretKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  /**
   * Auto-detect GPS location on page load
   */
  useEffect(() => {
    const tips = [
      'Requesting location permission...',
      'Detecting your location...',
      '💡 Tip: Use a descriptive class name',
      '💡 Tip: You can drag the pin to adjust location',
      '💡 Tip: Click anywhere on the map to set position',
    ];
    
    let tipIndex = 0;
    const tipInterval = setInterval(() => {
      tipIndex = (tipIndex + 1) % tips.length;
      setLoadingTip(tips[tipIndex]);
    }, 2000);

    handlePinCurrentLocation(false); // Auto-detect, no alerts

    return () => clearInterval(tipInterval);
  }, []);

  /**
   * Pin Current Location - GPS handler (reusable)
   */
  const handlePinCurrentLocation = (showAlerts = true) => {
    console.log('📍 handlePinCurrentLocation called, showAlerts:', showAlerts);
    
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      if (showAlerts) {
        alert('Geolocation is not supported by your browser');
      }
      setIsInitialLoad(false);
      return;
    }

    setIsLocating(true);
    console.log('🌐 Requesting geolocation with high accuracy...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ GPS success:', position.coords);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`📍 Location: ${lat}, ${lng} (±${accuracy}m)`);
        
        setMarkerPosition([lat, lng]);
        setHasGPS(true);
        setIsLocating(false);
        setIsInitialLoad(false);
        
        // Force map to re-render with new position
        setMapKey(prev => prev + 1);
      },
      (error) => {
        console.error('❌ GPS error:', {
          code: error.code,
          message: error.message,
        });
        setIsLocating(false);
        setIsInitialLoad(false);
        
        // Show error to user if they clicked the button manually
        if (showAlerts) {
          const errorMessages = {
            1: 'Location permission denied. Please allow location access in your browser settings.',
            2: 'Location unavailable. Please check your device GPS settings.',
            3: 'Location request timed out. Please try again.',
          };
          alert(errorMessages[error.code as 1 | 2 | 3] || 'Could not get location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0, // Don't use cached position
      }
    );
  };

  /**
   * Map Click Handler - allows clicking to set pin
   */
  const MapClickHandler = () => {
    const map = require('react-leaflet').useMapEvents({
      click(e: any) {
        setMarkerPosition([e.latlng.lat, e.latlng.lng]);
        setHasGPS(false); // Manual click, not GPS
      },
    });
    return null;
  };

  /**
   * Draggable Marker Component
   */
  const DraggableMarker = () => {
    const eventHandlers = useMemo(
      () => ({
        dragend(e: any) {
          const marker = e.target;
          const position = marker.getLatLng();
          setMarkerPosition([position.lat, position.lng]);
          setHasGPS(false); // User manually adjusted
        },
      }),
      []
    );

    // Leaflet icon fix
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const L = require('leaflet');
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      }
    }, []);

    return (
      <Marker draggable={true} eventHandlers={eventHandlers} position={markerPosition}>
        <Popup>
          <div className="text-center text-sm">
            <p className="font-medium mb-1">
              {hasGPS ? '📍 Current Location' : '📍 Classroom Location'}
            </p>
            <p className="text-xs text-gray-600">
              {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
            </p>
          </div>
        </Popup>
      </Marker>
    );
  };

  /**
   * Handle room creation
   */
  const handleLaunchRoom = async () => {
    // Validation
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const secretKey = generateSecretKey();

      const { data, error: insertError } = await supabase
        .from('active_rooms')
        .insert({
          room_name: roomName.trim(),
          secret_key: secretKey,
          teacher_lat: markerPosition[0],
          teacher_long: markerPosition[1],
          checkin_duration_mins: checkinDuration,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push(`/room/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Loading Screen - Show while detecting GPS */}
      {isInitialLoad && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
          <div className="loader mb-8"></div>
          <p className="text-lg text-gray-600 animate-pulse">{loadingTip}</p>
          
          <style jsx>{`
            .loader {
              width: 32px;
              aspect-ratio: 1;
              --_g: no-repeat radial-gradient(farthest-side, #000 90%, #0000);
              background: var(--_g), var(--_g), var(--_g), var(--_g);
              background-size: 40% 40%;
              animation: l46 1s infinite;
            }
            
            @keyframes l46 {
              0% {
                background-position: 0 0, 100% 0, 100% 100%, 0 100%;
              }
              40%,
              50% {
                background-position: 100% 100%, 100% 0, 0 0, 0 100%;
              }
              90%,
              100% {
                background-position: 100% 100%, 0 100%, 0 0, 100% 0;
              }
            }
          `}</style>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </a>
          <h1 className="text-2xl font-bold text-black">
            Attndee<span className="text-blue-600">.</span>
          </h1>
          <div className="w-16" /> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-light text-black mb-2">Create Class</h2>
          <p className="text-gray-500">Set up your attendance session</p>
        </div>

        <div className="space-y-8">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Computer Engineering 101"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-lg text-black placeholder:text-gray-400"
              maxLength={100}
            />
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Check-in Duration
            </label>
            <div className="flex gap-3">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setCheckinDuration(mins)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    checkinDuration === mins
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Map Location */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Classroom Location
              </label>
              <button
                type="button"
                onClick={() => handlePinCurrentLocation(true)}
                disabled={isLocating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
              >
                <LocateFixed size={16} className={isLocating ? 'animate-spin' : ''} />
                {isLocating ? 'Locating...' : 'Pin Current Location'}
              </button>
            </div>

            {/* Leaflet CSS */}
            <style jsx global>{`
              @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
              .leaflet-container {
                height: 400px;
                width: 100%;
                border-radius: 16px;
                z-index: 0;
              }
            `}</style>

            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
              <MapContainer
                key={mapKey}
                center={markerPosition}
                zoom={15}
                scrollWheelZoom={true}
                style={{ height: '400px', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler />
                <DraggableMarker />
              </MapContainer>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} />
              <span className="font-mono">
                {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
              </span>
              {hasGPS && <span className="text-green-600 font-medium">• GPS Locked</span>}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              💡 Drag the marker to adjust the exact classroom location
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleLaunchRoom}
            disabled={isCreating || !roomName.trim()}
            className="w-full py-4 bg-black text-white text-lg font-medium rounded-full hover:bg-gray-800 active:bg-gray-900 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Launching...
              </span>
            ) : (
              'Launch Room'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
