'use client';

/**
 * Attndee. - Minimalist 2-State & Responsive Home / Create Class Workspace
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  X,
  Trash2,
  Loader2,
  Download,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { supabase, TeacherCloudFile } from '@/utils/supabase';
import {
  parseSpreadsheetBuffer,
  parseRosterGrid,
  ParsedRosterResult,
  downloadExistingXlsxWithSummary,
} from '@/utils/xlsx-helper';
import {
  listTeacherCloudFiles,
  upsertTeacherCloudFile,
  downloadTeacherCloudFile,
  deleteTeacherCloudFile,
} from '@/utils/cloud-storage';
import TeacherAuthModal from '@/components/TeacherAuthModal';

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
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();

  // Form state
  const [roomName, setRoomName] = useState('');
  const [checkinDuration, setCheckinDuration] = useState(5);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([13.8476, 100.5696]);
  const detectionRadius = 50;
  const [mapKey, setMapKey] = useState(0);

  // Header Banner state
  const [showKuBanner, setShowKuBanner] = useState(true);

  // Responsive viewport detection
  const [isDesktop, setIsDesktop] = useState(true);

  // XLSX Import state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRoster, setParsedRoster] = useState<ParsedRosterResult | null>(null);
  const [selectedIdColumn, setSelectedIdColumn] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teacher Auth & Cloud Backup state
  const [teacherUser, setTeacherUser] = useState<{ id: string; email?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<TeacherCloudFile[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [loadingCloudFileId, setLoadingCloudFileId] = useState<string | null>(null);
  const [exportingCloudFileId, setExportingCloudFileId] = useState<string | null>(null);
  const [deletingCloudFileId, setDeletingCloudFileId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<TeacherCloudFile | null>(null);
  const [activeCloudFileId, setActiveCloudFileId] = useState<string | null>(null);
  // Column toggle for XLSX preview (clean by default: hide faculty, branch, emails)
  const [showDetailedColumns, setShowDetailedColumns] = useState(false);
  // Fullscreen / Expanded modal state for XLSX table
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [hasGPS, setHasGPS] = useState(false);

  const refreshCloudFiles = useCallback(async () => {
    setIsLoadingCloud(true);
    try {
      const files = await listTeacherCloudFiles();
      setCloudFiles(files);
    } catch (err) {
      console.error('Failed to refresh cloud files:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setTeacherUser({ id: session.user.id, email: session.user.email });
        refreshCloudFiles();
      } else {
        setTeacherUser(null);
        setCloudFiles([]);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTeacherUser({ id: session.user.id, email: session.user.email });
        refreshCloudFiles();
      } else {
        setTeacherUser(null);
        setCloudFiles([]);
        setActiveCloudFileId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshCloudFiles]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };
    updateViewport(mediaQuery);
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const generateSecretKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const handlePinCurrentLocation = useCallback((showAlerts = true) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (showAlerts) {
        setError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
      }
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarkerPosition([lat, lng]);
        setHasGPS(true);
        setIsLocating(false);
        setMapKey((prev) => prev + 1);
      },
      () => {
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    handlePinCurrentLocation(false);
  }, [handlePinCurrentLocation]);

  const MapController = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const leaflet = require('react-leaflet');
    const map = leaflet.useMap();

    useEffect(() => {
      const timer1 = setTimeout(() => map.invalidateSize(), 100);
      const timer2 = setTimeout(() => map.invalidateSize(), 350);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }, [map]);

    leaflet.useMapEvents({
      click(e: any) {
        setMarkerPosition([e.latlng.lat, e.latlng.lng]);
        setHasGPS(false);
      },
    });
    return null;
  };

  const DraggableMarker = () => {
    const eventHandlers = useMemo(
      () => ({
        dragend(e: any) {
          const marker = e.target;
          const position = marker.getLatLng();
          setMarkerPosition([position.lat, position.lng]);
          setHasGPS(false);
        },
      }),
      []
    );

    useEffect(() => {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
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
          <div className="text-center text-xs">
            <p className="font-semibold mb-0.5">
              {hasGPS ? 'พิกัดปัจจุบันของคุณ' : 'ตำแหน่งห้องเรียน'}
            </p>
            <p className="text-[11px] text-gray-500">
              {markerPosition[0].toFixed(6)}, {markerPosition[1].toFixed(6)}
            </p>
          </div>
        </Popup>
      </Marker>
    );
  };

  const processFile = (
    file: File,
    options?: { skipCloudUpload?: boolean; cloudFileId?: string }
  ) => {
    setError(null);
    setUploadedFile(file);
    if (options?.cloudFileId) {
      setActiveCloudFileId(options.cloudFileId);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheetBuffer(buffer, 'array');
        setParsedRoster(parsed);
        setSelectedIdColumn(parsed.selectedIdColumn);
        if (parsed.xlsxBase64) {
          try {
            localStorage.setItem('attndee_latest_xlsx_base64', parsed.xlsxBase64);
          } catch {}
        }

        if (parsed.suggestedRoomName && parsed.suggestedRoomName.trim()) {
          setRoomName(parsed.suggestedRoomName.trim());
        }

        // Automatically back up to Teacher's Cloud Storage if logged in & uploaded from local device
        if (teacherUser && !options?.skipCloudUpload) {
          try {
            const savedCloud = await upsertTeacherCloudFile({
              fileBlob: file,
              filename: file.name,
              courseName: parsed.suggestedRoomName || undefined,
              studentCount: parsed.students.length,
            });
            if (savedCloud) {
              setActiveCloudFileId(savedCloud.id);
              await refreshCloudFiles();
            }
          } catch (cloudErr) {
            console.warn('Cloud auto-backup warning:', cloudErr);
          }
        }
      } catch {
        setError('ไม่สามารถอ่านไฟล์รายชื่อได้ กรุณาตรวจสอบไฟล์ .xlsx');
        setUploadedFile(null);
        setParsedRoster(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSelectCloudFile = async (cloudFile: TeacherCloudFile) => {
    setError(null);
    setLoadingCloudFileId(cloudFile.id);
    try {
      const downloadedFile = await downloadTeacherCloudFile(cloudFile);
      processFile(downloadedFile, {
        skipCloudUpload: true,
        cloudFileId: cloudFile.id,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ไม่สามารถโหลดไฟล์จาก Cloud ได้'
      );
    } finally {
      setLoadingCloudFileId(null);
    }
  };

  const handleExportCloudFile = async (
    e: React.MouseEvent,
    cloudFile: TeacherCloudFile
  ) => {
    e.stopPropagation();
    setError(null);
    setExportingCloudFileId(cloudFile.id);
    try {
      const downloadedFile = await downloadTeacherCloudFile(cloudFile);
      const buffer = await downloadedFile.arrayBuffer();
      downloadExistingXlsxWithSummary(buffer, cloudFile.filename);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลดไฟล์จาก Cloud ได้'
      );
    } finally {
      setExportingCloudFileId(null);
    }
  };

  const handleDeleteCloudFile = (
    e: React.MouseEvent,
    cloudFile: TeacherCloudFile
  ) => {
    e.stopPropagation();
    setFileToDelete(cloudFile);
  };

  const confirmDeleteCloudFile = async () => {
    if (!fileToDelete) return;
    const targetFile = fileToDelete;
    setDeletingCloudFileId(targetFile.id);
    try {
      await deleteTeacherCloudFile(targetFile);
      setCloudFiles((prev) => prev.filter((f) => f.id !== targetFile.id));
      if (activeCloudFileId === targetFile.id) {
        handleResetImport();
      }
      setFileToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ไม่สามารถลบไฟล์จาก Cloud ได้'
      );
    } finally {
      setDeletingCloudFileId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTeacherUser(null);
    setCloudFiles([]);
    setActiveCloudFileId(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleResetImport = () => {
    setUploadedFile(null);
    setParsedRoster(null);
    setSelectedIdColumn('');
    setActiveCloudFileId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleColumnClick = (colIndex: number) => {
    if (!parsedRoster) return;
    const updated = parseRosterGrid(parsedRoster.rawGrid, colIndex);
    updated.xlsxBase64 = parsedRoster.xlsxBase64;
    // Prevent accidental clicks on non-ID columns from wiping out the detected roster
    if (updated.students.length === 0) return;
    if (parsedRoster.isKuFormat && updated.students.length < parsedRoster.students.length / 2) {
      return;
    }
    setParsedRoster(updated);
    setSelectedIdColumn(updated.selectedIdColumn);
  };

  const handleLaunchRoom = async () => {
    if (!roomName.trim()) {
      setError('กรุณากรอกชื่อคลาสของคุณ');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const secretKey = generateSecretKey();

      const studentListData = parsedRoster
        ? {
            xlsx_data: parsedRoster.rawGrid,
            xlsx_base64: parsedRoster.xlsxBase64,
            id_column: selectedIdColumn,
            checkmark_column: parsedRoster.nextAttendanceColumn || 'new',
            filename: uploadedFile?.name || 'student_list.xlsx',
            cloud_file_id: activeCloudFileId || undefined,
            has_roster: parsedRoster.students.length > 0,
            course_meta: parsedRoster.courseMeta,
            roster_students: parsedRoster.students,
            radius_meters: detectionRadius,
            is_closed: false,
            device_checkins: [],
          }
        : null;

      const { data, error: insertError } = await supabase
        .from('active_rooms')
        .insert({
          room_name: roomName.trim(),
          secret_key: secretKey,
          teacher_lat: markerPosition[0],
          teacher_long: markerPosition[1],
          checkin_duration_mins: checkinDuration,
          teacher_id: teacherUser?.id || null,
          student_list_json: studentListData,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (studentListData && data?.id) {
        try {
          localStorage.setItem(`attndee_room_roster_${data.id}`, JSON.stringify(studentListData));
          if (parsedRoster?.xlsxBase64) {
            localStorage.setItem('attndee_latest_xlsx_base64', parsedRoster.xlsxBase64);
          }
        } catch (storageErr) {
          console.warn('Could not save roster to localStorage:', storageErr);
        }

        // Register roster fingerprints with backend runtime memory (non-blocking)
        fetch('/api/checkin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_id: data.id,
            roster_students: studentListData.roster_students,
            radius_meters: detectionRadius,
          }),
        }).catch(() => {});
      }

      router.push(`/room/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถสร้างห้องเช็คชื่อได้');
      setIsCreating(false);
    }
  };

  const hasFile = Boolean(parsedRoster);
  const isLoggedIn = Boolean(teacherUser);

  const previewStartRow = useMemo(() => {
    if (!parsedRoster) return 0;
    return parsedRoster.isKuFormat ? parsedRoster.courseMeta.header_row_index : 0;
  }, [parsedRoster]);

  const previewRowsWithIndex = useMemo(() => {
    if (!parsedRoster) return [];
    const result: Array<{ row: any[]; actualRowIndex: number }> = [];
    for (let r = previewStartRow; r < parsedRoster.rawGrid.length; r++) {
      const row = parsedRoster.rawGrid[r] || [];
      const hasAnyContent = row.some(
        (cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''
      );
      if (hasAnyContent) {
        result.push({ row, actualRowIndex: r });
      }
    }
    return result;
  }, [parsedRoster, previewStartRow]);

  const validStudentRowSet = useMemo(() => {
    if (!parsedRoster) return new Set<number>();
    return new Set(parsedRoster.students.map((s) => s.row_index));
  }, [parsedRoster]);

  const visibleColumnCount = useMemo(() => {
    if (!parsedRoster || previewRowsWithIndex.length === 0) return 0;
    let maxCol = parsedRoster.nextAttendanceColIndex + 1;
    for (const { row } of previewRowsWithIndex) {
      for (let c = 0; c < Math.min(row.length, 22); c++) {
        if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
          if (c + 1 > maxCol) maxCol = c + 1;
        }
      }
    }
    return Math.max(maxCol, 1);
  }, [parsedRoster, previewRowsWithIndex]);

  const todayDateLabel = useMemo(() => new Date().toLocaleDateString('th-TH'), []);

  // Determine which column indices to show/hide based on showDetailedColumns
  const visibleColumnIndices = useMemo(() => {
    if (!parsedRoster || previewRowsWithIndex.length === 0) return [];
    const allCols: number[] = [];
    for (let i = 0; i < visibleColumnCount; i++) {
      allCols.push(i);
    }

    // Permanently hide Column A (index 0) in the preview UI
    const filteredA = allCols.filter((colIdx) => colIdx !== 0);

    if (showDetailedColumns) return filteredA;

    // Filter out detailed / contact columns when collapsed:
    // Faculty, Major, Major Code, Status, Google Email, KU/Office365 Email
    return filteredA.filter((colIdx) => {
      // Always keep ID column and attendance column
      const headerName = parsedRoster.columnHeaders[colIdx] || '';
      const isIdCol = headerName === selectedIdColumn;
      const isAttendanceCol = colIdx === parsedRoster.nextAttendanceColIndex;
      if (isIdCol || isAttendanceCol) return true;

      // Check header text in rawGrid at header_row_index or parsed columnHeaders
      const headerText = String(
        parsedRoster.rawGrid[parsedRoster.courseMeta.header_row_index]?.[colIdx] ||
          headerName ||
          ''
      ).toLowerCase();

      const isDetailCol =
        headerText.includes('คณะ') ||
        headerText.includes('faculty') ||
        headerText.includes('สาขาวิชา') ||
        headerText.includes('สาขา') ||
        headerText.includes('major') ||
        headerText.includes('สถานะ') ||
        headerText.includes('status') ||
        headerText.includes('google') ||
        headerText.includes('office') ||
        headerText.includes('365') ||
        headerText.includes('email') ||
        headerText.includes('อีเมล') ||
        headerText.includes('ku.th');

      return !isDetailCol;
    });
  }, [parsedRoster, previewRowsWithIndex, visibleColumnCount, showDetailedColumns, selectedIdColumn]);

  // Detected historical attendance date column indices (dates preceding nextAttendanceColIndex)
  const historicalAttendanceColIndices = useMemo(() => {
    if (!parsedRoster) return [];
    const dateCols: number[] = [];
    const headerRow = parsedRoster.rawGrid[parsedRoster.courseMeta.header_row_index] || [];
    const idColIdx = parsedRoster.columnHeaders.indexOf(selectedIdColumn);

    for (let c = Math.max(0, idColIdx + 1); c < parsedRoster.nextAttendanceColIndex; c++) {
      const headerVal = String(headerRow[c] ?? '').trim();
      // Date patterns like DD/MM/YYYY, D/M/YY or numbers with slashes/dashes
      const isDate =
        /\d{1,2}[/-]\d{1,2}/.test(headerVal) ||
        (/\d+/.test(headerVal) && headerVal.length >= 4);

      // Check if student cells in this column contain scores (0, 0.5, 1, etc.)
      let hasNumericScores = false;
      for (const student of parsedRoster.students) {
        const val = parsedRoster.rawGrid[student.row_index]?.[c];
        if (typeof val === 'number' || (typeof val === 'string' && /^[0-9]+(\.[0-9]+)?$/.test(val.trim()))) {
          hasNumericScores = true;
          break;
        }
      }

      if (isDate || hasNumericScores) {
        dateCols.push(c);
      }
    }
    return dateCols;
  }, [parsedRoster, selectedIdColumn]);

  // Total attended count per column (bottom sum)
  const columnAttendanceSums = useMemo(() => {
    if (!parsedRoster) return new Map<number, number>();
    const sums = new Map<number, number>();
    for (const c of historicalAttendanceColIndices) {
      let colTotal = 0;
      for (const student of parsedRoster.students) {
        const rawVal = parsedRoster.rawGrid[student.row_index]?.[c];
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal ?? '').trim());
        if (!isNaN(num) && num > 0) {
          colTotal += num;
        }
      }
      sums.set(c, colTotal);
    }
    return sums;
  }, [parsedRoster, historicalAttendanceColIndices]);

  // Total attended count per student (breakdown: on-time, late, absent)
  const studentAttendanceStats = useMemo(() => {
    if (!parsedRoster) {
      return new Map<number, { onTime: number; late: number; absent: number; totalPresent: number; scoreSum: number }>();
    }
    const rowMap = new Map<number, { onTime: number; late: number; absent: number; totalPresent: number; scoreSum: number }>();
    const totalSessions = historicalAttendanceColIndices.length;

    for (const student of parsedRoster.students) {
      let onTime = 0;
      let late = 0;
      let scoreSum = 0;

      for (const c of historicalAttendanceColIndices) {
        const rawVal = parsedRoster.rawGrid[student.row_index]?.[c];
        const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal ?? '').trim());
        if (!isNaN(num) && num > 0) {
          scoreSum += num;
          if (num >= 1) {
            onTime += 1;
          } else {
            late += 1; // 0.5 score means attended late
          }
        }
      }

      const totalPresent = onTime + late;
      // Absent count counts only past completed sessions where student explicitly received 0 or had no attendance
      const absent = Math.max(0, totalSessions - totalPresent);
      rowMap.set(student.row_index, { onTime, late, absent, totalPresent, scoreSum });
    }
    return rowMap;
  }, [parsedRoster, historicalAttendanceColIndices]);

  const renderMapBox = (roundedClass: string) => (
    <div className={`relative w-full h-full overflow-hidden bg-[#cbe6cc] ${roundedClass}`}>
      <MapContainer
        key={`${mapKey}-${hasFile || isLoggedIn ? 'left' : 'right'}-${isDesktop ? 'lg' : 'sm'}`}
        center={markerPosition}
        zoom={16}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={markerPosition}
          radius={detectionRadius}
          pathOptions={{
            color: '#0051fc',
            fillColor: '#0051fc',
            fillOpacity: 0.18,
          }}
        />
        <MapController />
        <DraggableMarker />
      </MapContainer>

      {/* Floating "ปักพิกัดปัจจุบัน" Pill Button inside bottom-right of map */}
      <button
        type="button"
        onClick={() => handlePinCurrentLocation(true)}
        disabled={isLocating}
        className="absolute bottom-5 right-5 z-[400] flex items-center gap-2 px-4 py-2.5 bg-[#0051fc] hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
      >
        <MapPin size={16} className="fill-white text-[#0051fc]" />
        <span>{isLocating ? 'กำลังค้นหา...' : 'ปักพิกัดปัจจุบัน'}</span>
      </button>
    </div>
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className="min-h-screen lg:h-screen bg-white flex flex-col lg:overflow-hidden relative"
    >
      {/* Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255, 255, 255, 0.5) !important;
        }
      `}</style>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
        id="xlsx-upload"
      />

      {/* Fullscreen Drag Overlay Feedback */}
      {isDragging && (
        <div className="fixed inset-4 z-50 border-2 border-dashed border-[#0051fc] bg-blue-50/40 rounded-3xl flex items-center justify-center pointer-events-none">
          <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-blue-200 text-sm font-bold text-[#0051fc]">
            วางไฟล์รายชื่อ (.xlsx) ที่นี่ได้เลย
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="w-full max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-20 pt-8 sm:pt-10 pb-6 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        {/* Left: Attndee. Logo */}
        <Link href="/" className="text-3xl sm:text-[38px] font-bold tracking-tight text-black select-none leading-none">
          Attndee<span className="text-[#0051fc]">.</span>
        </Link>

        {/* Right: My KU Notification Pill + Cloud Auth + คู่มือ Button */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {showKuBanner && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative flex items-center gap-3 px-4 sm:px-5 py-2 bg-[#f4fbf7] border border-[#2bb673] rounded-xl cursor-pointer hover:bg-[#eaf8f0] transition-colors"
              title="คลิกเพื่ออัปโหลดไฟล์รายชื่อจาก myKU"
            >
              {/* Red "ใหม่" Badge */}
              <span className="absolute -top-2.5 -left-3 bg-[#ff0000] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full leading-tight shadow-xs">
                ใหม่
              </span>

              {/* Official KU Logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/KU_Logo_PNG.png"
                alt="KU Logo"
                className="h-7 w-auto object-contain flex-shrink-0"
              />

              <span className="text-xs sm:text-sm font-bold text-black whitespace-nowrap">
                รองรับไฟล์รายชื่อจาก My KU แล้ว
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowKuBanner(false);
                }}
                className="ml-1 text-black hover:text-gray-600 transition-colors p-0.5 cursor-pointer"
                aria-label="ปิดการแจ้งเตือน"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Teacher Cloud Backup Auth Button / Status */}
          {isLoggedIn && teacherUser ? (
            <div className="flex items-center gap-3 bg-[#efefef] px-4 py-2 rounded-lg">
              <span className="text-xs sm:text-sm font-bold text-black max-w-[160px] sm:max-w-[200px] truncate">
                {teacherUser.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-bold text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                ออก
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="px-6 sm:px-7 py-2.5 bg-[#0051fc] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          )}

          <Link
            href="/docs"
            className="px-6 sm:px-8 py-2.5 bg-[#efefef] hover:bg-[#e4e4e4] text-black text-xs sm:text-sm font-bold rounded-lg transition-colors"
          >
            คู่มือ
          </Link>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTENT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-20 pt-2 sm:pt-4 pb-8 lg:pb-12 flex flex-col lg:flex-row items-stretch justify-between gap-10 lg:gap-24 xl:gap-32 min-h-0">
        {/* LEFT COLUMN */}
        <div
          className={`w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 flex flex-col min-h-0 ${
            hasFile || isLoggedIn ? 'justify-between gap-4' : 'justify-start pt-4 lg:pt-8 gap-5'
          }`}
        >
          {/* Hero Heading + Handwritten Callout (Shown in State 1 before XLSX upload when not logged in) */}
          {!hasFile && !isLoggedIn && (
            <div className="flex items-start justify-between gap-2 w-full pb-1">
              <h1 className="text-[28px] sm:text-[34px] xl:text-[36px] font-bold text-black leading-[1.28] tracking-tight whitespace-nowrap flex-shrink-0 pt-2">
                เช็คชื่อง่ายๆ
                <br />
                ได้ใน 3 ขั้นตอน!
              </h1>

              {/* Handwritten Drag-and-Drop Callout + Arrow aligned strictly within the right edge of the form */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-end text-right cursor-pointer focus:outline-none flex-shrink-0 max-w-[210px] sm:max-w-none"
                title="คลิกเพื่อเลือกไฟล์ .xlsx หรือลากไฟล์มาวาง"
              >
                <span
                  style={{ fontFamily: 'var(--font-kaohom), sans-serif' }}
                  className="text-[17px] sm:text-[19px] xl:text-[21px] text-black -rotate-6 group-hover:text-[#0051fc] transition-colors whitespace-nowrap leading-none mr-1"
                >
                  หรือลากไฟล์รายชื่อลงมาใส่ก็ได้นะ!
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/arrowpointingdown.png"
                  alt=""
                  className="w-14 sm:w-16 xl:w-[68px] h-auto mr-3 mt-2 select-none pointer-events-none"
                />
              </button>
            </div>
          )}

          {/* Step 1: Class Name Input */}
          <div className="flex-shrink-0">
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="ชื่อคลาสของคุณ"
              className="w-full px-5 py-4 border border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-base sm:text-lg text-black placeholder:text-gray-300 bg-white"
              maxLength={120}
            />
          </div>

          {/* Step 2: 3 Duration Buttons (5, 10, 15 mins) */}
          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            {[5, 10, 15].map((mins) => {
              const isSelected = checkinDuration === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setCheckinDuration(mins)}
                  className={`py-4 rounded-xl text-sm sm:text-base font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#6ea0f5] border border-[#3b78e7] text-white'
                      : 'bg-white border border-neutral-800 text-black hover:bg-gray-50'
                  }`}
                >
                  {mins} นาที
                </button>
              );
            })}
          </div>

          {/* Step 3 (In Left Column when file is uploaded, logged in, OR on Mobile/Tablet < 1024px) */}
          {(hasFile || isLoggedIn || !isDesktop) && (
            <div className="w-full h-[230px] sm:h-[260px] lg:flex-1 lg:min-h-[210px] flex-shrink-0">
              {renderMapBox('rounded-[26px]')}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-xs sm:text-sm text-red-600 font-medium px-1 flex-shrink-0">
              {error}
            </p>
          )}

          {/* Primary Blue Pill Button (Grayed out when required details are incomplete) */}
          <div className="pt-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleLaunchRoom}
              disabled={isCreating || !roomName.trim()}
              className="w-full py-4 sm:py-4.5 bg-[#0051fc] hover:bg-blue-700 active:scale-[0.99] text-white text-base sm:text-lg font-bold rounded-full transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:hover:bg-gray-200 disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCreating ? 'กำลังเปิดห้องเช็คชื่อ...' : 'เริ่มเช็คชื่อเลย'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* State 1 (Desktop, Logged Out, No File): Large Classroom Map on the Right */}
          {!hasFile && !isLoggedIn && isDesktop && (
            <div className="w-full h-full">
              {renderMapBox('rounded-[32px]')}
            </div>
          )}

          {/* State 1B (Logged In, No File Selected): Cloud Excel KU Files List */}
          {!hasFile && isLoggedIn && (
            <div className="w-full h-[460px] lg:h-full bg-[#f7f7f7] border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
              {/* Cloud Panel Header */}
              <div className="px-5 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-black">
                    ไฟล์รายชื่อ
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">
                    {cloudFiles.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-[#efefef] hover:bg-[#e4e4e4] text-black text-xs font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  + เพิ่มไฟล์
                </button>
              </div>

              {/* Cloud Files List Body */}
              <div className="flex-1 overflow-auto p-4 space-y-2.5">
                {isLoadingCloud ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    กำลังโหลด...
                  </div>
                ) : cloudFiles.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-full min-h-[240px] border border-dashed border-gray-300 hover:border-black bg-white rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-bold text-black">
                      ยังไม่มีไฟล์รายชื่อ
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ลากไฟล์ .xlsx มาวาง หรือคลิกเพื่อเลือกไฟล์
                    </p>
                  </div>
                ) : (
                  cloudFiles.map((file) => {
                    const isDownloadingThis = loadingCloudFileId === file.id;
                    const isExportingThis = exportingCloudFileId === file.id;
                    const isDeletingThis = deletingCloudFileId === file.id;
                    const updatedDateStr = new Date(file.updated_at).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (!isDownloadingThis && !isExportingThis && !isDeletingThis) {
                            handleSelectCloudFile(file);
                          }
                        }}
                        className={`group bg-white border border-gray-200 hover:border-black rounded-xl px-4 py-3.5 flex items-center justify-between gap-4 transition-all cursor-pointer ${
                          isDownloadingThis ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-black group-hover:text-[#0051fc] transition-colors truncate">
                            {file.course_name || file.filename.replace(/\.[^/.]+$/, '')}
                          </h4>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {file.filename} · {file.student_count} คน
                          </p>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                          <span className="hidden sm:inline-block text-xs text-gray-400 mr-1">
                            {isDownloadingThis ? 'กำลังโหลด...' : updatedDateStr}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleExportCloudFile(e, file)}
                            disabled={isExportingThis}
                            className="p-1.5 text-gray-500 hover:text-[#0051fc] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="ดาวน์โหลดไฟล์ .xlsx (พร้อมคอลัมน์รวมคะแนน)"
                          >
                            {isExportingThis ? (
                              <Loader2 size={15} className="animate-spin text-[#0051fc]" />
                            ) : (
                              <Download size={15} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCloudFile(e, file)}
                            disabled={isDeletingThis}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบไฟล์"
                          >
                            {isDeletingThis ? (
                              <Loader2 size={15} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* State 2: XLSX Preview Window on the Right (or stacked below on Mobile/Tablet) */}
          {hasFile && parsedRoster && (
            <div className="w-full h-[460px] lg:h-full bg-[#f7f7f7] border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
              {/* Preview Header */}
              <div className="px-5 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-black truncate">
                      {uploadedFile?.name || 'XLSX Preview'}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-black rounded-full font-semibold flex-shrink-0">
                      {parsedRoster.students.length} คน
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    คลิกหัวคอลัมน์เพื่อเปลี่ยนคอลัมน์รหัสนิสิต • ระบบจะเติมคะแนนเช็คชื่อวันนี้ ({todayDateLabel}) ลงในคอลัมน์ {parsedRoster.nextAttendanceColumn} อัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Checkmark Toggle for Detailed Columns */}
                  <label
                    onClick={() => setShowDetailedColumns((prev) => !prev)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black cursor-pointer select-none bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl transition-colors"
                    title={showDetailedColumns ? 'คลิกเพื่อซ่อนข้อมูลเพิ่มเติม' : 'คลิกเพื่อแสดงข้อมูลเพิ่มเติม (คณะ, สาขา, อีเมล)'}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        showDetailedColumns
                          ? 'bg-[#0051fc] border-[#0051fc] text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {showDetailedColumns && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span>แสดงข้อมูลเพิ่มเติม</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFullscreenPreview(true)}
                    className="p-1.5 text-gray-500 hover:text-[#0051fc] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="ขยายตารางเต็มจอ"
                  >
                    <Maximize2 size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetImport}
                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    title="นำไฟล์ออก"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Clean Spreadsheet Table */}
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-xs sm:text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="border-b border-r border-gray-200 px-2 py-2.5 bg-gray-100 font-semibold text-center text-gray-600 w-12 flex-shrink-0">
                        #
                      </th>
                      {visibleColumnIndices.map((i) => {
                        const header = parsedRoster.columnHeaders[i] || `Col ${i + 1}`;
                        const isIdColumn = header === selectedIdColumn;
                        const isAttendanceCol = i === parsedRoster.nextAttendanceColIndex;
                        const isSeqCol = i === 1; // Column B (ลำดับที่)
                        return (
                          <th
                            key={i}
                            onClick={() => {
                              if (!isAttendanceCol) handleColumnClick(i);
                            }}
                            className={`border-b border-r border-gray-200 py-2.5 font-semibold text-left transition-colors whitespace-nowrap ${
                              isSeqCol ? 'w-14 min-w-[56px] max-w-[64px] px-2 text-center' : 'px-3'
                            } ${
                              isIdColumn
                                ? 'bg-[#0051fc] text-white cursor-pointer'
                                : isAttendanceCol
                                ? 'bg-[#2bb673] text-white cursor-default'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                            }`}
                          >
                            <div className={`flex items-center gap-2 ${isSeqCol ? 'justify-center' : 'justify-between'}`}>
                              <span>{header}</span>
                              {isIdColumn && (
                                <span className="text-[10px] bg-white text-[#0051fc] px-1.5 py-0.5 rounded font-bold">
                                  รหัสนิสิต
                                </span>
                              )}
                              {isAttendanceCol && (
                                <span className="text-[10px] bg-white text-[#1f9d5c] px-1.5 py-0.5 rounded font-bold">
                                  ช่องเติมคะแนนวันนี้
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}

                      {/* Sticky Right-locked Purple Summary Column */}
                      <th className="sticky right-0 z-20 border-b border-l border-purple-200 px-3.5 py-2.5 bg-[#8b5cf6] text-white font-bold text-center whitespace-nowrap shadow-[-4px_0_12px_rgba(139,92,246,0.15)] min-w-[140px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>มา / สาย / ขาด</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRowsWithIndex.map(({ row, actualRowIndex }, rowIdx) => {
                      const isHeaderRow = actualRowIndex === parsedRoster.courseMeta.header_row_index;
                      const isStudentRow = validStudentRowSet.has(actualRowIndex);
                      const stats = studentAttendanceStats.get(actualRowIndex);

                      return (
                        <tr
                          key={actualRowIndex}
                          className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}
                        >
                          <td className="border-b border-r border-gray-200 px-2 py-2 text-center text-gray-400 font-mono text-xs w-12">
                            {rowIdx + 1}
                          </td>
                          {visibleColumnIndices.map((colIdx) => {
                            const isIdColumn =
                              parsedRoster.columnHeaders[colIdx] === selectedIdColumn;
                            const isAttendanceCol = colIdx === parsedRoster.nextAttendanceColIndex;
                            const isSeqCol = colIdx === 1; // Column B (ลำดับที่)
                            const val = row[colIdx];

                            if (isAttendanceCol) {
                              if (isHeaderRow || isStudentRow) {
                                return (
                                  <td
                                    key={colIdx}
                                    className="border-b border-r border-[#2bb673]/30 px-3 py-2 bg-[#f4fbf7] text-[#1f9d5c] font-mono font-semibold text-center whitespace-nowrap"
                                  >
                                    {isHeaderRow ? todayDateLabel : '—'}
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={colIdx}
                                  className="border-b border-r border-gray-200 px-3 py-2 text-gray-700"
                                />
                              );
                            }

                            return (
                              <td
                                key={colIdx}
                                className={`border-b border-r border-gray-200 py-2 text-gray-700 truncate ${
                                  isSeqCol ? 'w-14 min-w-[56px] max-w-[64px] px-2 text-center font-mono' : 'px-3 max-w-[200px]'
                                } ${
                                  isIdColumn ? 'bg-blue-50/50 font-semibold text-black font-mono' : ''
                                }`}
                              >
                                {val !== undefined && val !== null && String(val).trim() !== ''
                                  ? String(val)
                                  : ''}
                              </td>
                            );
                          })}

                          {/* Sticky Right-locked Purple Summary Cell */}
                          <td className={`sticky right-0 z-10 border-b border-l border-purple-100 px-3 py-2 text-center whitespace-nowrap shadow-[-4px_0_12px_rgba(139,92,246,0.1)] ${
                            isHeaderRow
                              ? 'bg-purple-100/80 text-purple-900 font-semibold text-xs'
                              : isStudentRow
                              ? 'bg-[#f5f3ff]'
                              : 'bg-white text-gray-300'
                          }`}>
                            {isHeaderRow ? (
                              'มา / สาย / ขาด'
                            ) : isStudentRow ? (
                              stats ? (
                                <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold">
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    title={`มาตรงเวลา: ${stats.onTime} ครั้ง`}
                                  >
                                    {stats.onTime}
                                  </span>
                                  <span className="text-gray-300 font-normal">/</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border ${
                                      stats.late > 0
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                                        : 'bg-gray-50 text-gray-400 border-gray-200'
                                    }`}
                                    title={`มาสาย: ${stats.late} ครั้ง`}
                                  >
                                    {stats.late}
                                  </span>
                                  <span className="text-gray-300 font-normal">/</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded border ${
                                      stats.absent > 0
                                        ? 'bg-rose-50 text-rose-600 border-rose-200 font-bold'
                                        : 'bg-gray-50 text-gray-400 border-gray-200'
                                    }`}
                                    title={`ขาดเรียน: ${stats.absent} ครั้ง`}
                                  >
                                    {stats.absent}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 font-mono text-xs">0 / 0 / 0</span>
                              )
                            ) : (
                              ''
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Teacher Cloud Backup Auth Popup Modal */}
      <TeacherAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          refreshCloudFiles();
        }}
      />

      {/* Confirmation Modal: Delete Cloud File */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-black">
                ยืนยันการลบไฟล์?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                คุณกำลังจะลบไฟล์ <span className="font-semibold text-black break-all">{fileToDelete.filename}</span> ออกจาก Cloud Storage การดำเนินการนี้ไม่สามารถยกเลิกได้
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={Boolean(deletingCloudFileId)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteCloudFile}
                disabled={Boolean(deletingCloudFileId)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {deletingCloudFileId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ลบไฟล์</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen / Expanded Table Modal */}
      {isFullscreenPreview && hasFile && parsedRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-[96vw] h-[92vh] shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-black truncate">
                    {uploadedFile?.name || 'XLSX Preview'}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-black rounded-full font-semibold flex-shrink-0">
                    {parsedRoster.students.length} คน
                  </span>
                  <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-[#0051fc] border border-blue-200 rounded-full font-semibold flex-shrink-0">
                    รหัสนิสิต: คอลัมน์ {selectedIdColumn}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                  คลิกหัวคอลัมน์เพื่อเปลี่ยนคอลัมน์รหัสนิสิต • ระบบจะเติมคะแนนเช็คชื่อวันนี้ ({todayDateLabel}) ลงในคอลัมน์ {parsedRoster.nextAttendanceColumn}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Checkmark Toggle in Fullscreen */}
                <label
                  onClick={() => setShowDetailedColumns((prev) => !prev)}
                  className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-black cursor-pointer select-none bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      showDetailedColumns
                        ? 'bg-[#0051fc] border-[#0051fc] text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {showDetailedColumns && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span>แสดงข้อมูลเพิ่มเติม</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(false)}
                  className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 font-semibold text-xs sm:text-sm border border-gray-200 cursor-pointer"
                  title="ย่อขนาดกลับ"
                >
                  <Minimize2 size={16} />
                  <span>ย่อกลับ</span>
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-xs sm:text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="border-b border-r border-gray-200 px-2 py-3 bg-gray-100 font-semibold text-center text-gray-600 w-12 flex-shrink-0">
                      #
                    </th>
                    {visibleColumnIndices.map((i) => {
                      const header = parsedRoster.columnHeaders[i] || `Col ${i + 1}`;
                      const isIdColumn = header === selectedIdColumn;
                      const isAttendanceCol = i === parsedRoster.nextAttendanceColIndex;
                      const isSeqCol = i === 1; // Column B (ลำดับที่)
                      return (
                        <th
                          key={i}
                          onClick={() => {
                            if (!isAttendanceCol) handleColumnClick(i);
                          }}
                          className={`border-b border-r border-gray-200 py-3 font-semibold text-left transition-colors whitespace-nowrap ${
                            isSeqCol ? 'w-14 min-w-[56px] max-w-[64px] px-2 text-center' : 'px-3.5'
                          } ${
                            isIdColumn
                              ? 'bg-[#0051fc] text-white cursor-pointer'
                              : isAttendanceCol
                              ? 'bg-[#2bb673] text-white cursor-default'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                          }`}
                        >
                          <div className={`flex items-center gap-2 ${isSeqCol ? 'justify-center' : 'justify-between'}`}>
                            <span>{header}</span>
                            {isIdColumn && (
                              <span className="text-[10px] bg-white text-[#0051fc] px-1.5 py-0.5 rounded font-bold">
                                รหัสนิสิต
                              </span>
                            )}
                            {isAttendanceCol && (
                              <span className="text-[10px] bg-white text-[#1f9d5c] px-1.5 py-0.5 rounded font-bold">
                                ช่องเติมคะแนนวันนี้
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}

                    {/* Sticky Right-locked Purple Summary Column */}
                    <th className="sticky right-0 z-20 border-b border-l border-purple-200 px-4 py-3 bg-[#8b5cf6] text-white font-bold text-center whitespace-nowrap shadow-[-4px_0_12px_rgba(139,92,246,0.15)] min-w-[140px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>มา / สาย / ขาด</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewRowsWithIndex.map(({ row, actualRowIndex }, rowIdx) => {
                    const isHeaderRow = actualRowIndex === parsedRoster.courseMeta.header_row_index;
                    const isStudentRow = validStudentRowSet.has(actualRowIndex);
                    const stats = studentAttendanceStats.get(actualRowIndex);

                    return (
                      <tr
                        key={actualRowIndex}
                        className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}
                      >
                        <td className="border-b border-r border-gray-200 px-2 py-2.5 text-center text-gray-400 font-mono text-xs w-12">
                          {rowIdx + 1}
                        </td>
                        {visibleColumnIndices.map((colIdx) => {
                          const isIdColumn =
                            parsedRoster.columnHeaders[colIdx] === selectedIdColumn;
                          const isAttendanceCol = colIdx === parsedRoster.nextAttendanceColIndex;
                          const isSeqCol = colIdx === 1; // Column B (ลำดับที่)
                          const val = row[colIdx];

                          if (isAttendanceCol) {
                            if (isHeaderRow || isStudentRow) {
                              return (
                                <td
                                  key={colIdx}
                                  className="border-b border-r border-[#2bb673]/30 px-3 py-2.5 bg-[#f4fbf7] text-[#1f9d5c] font-mono font-semibold text-center whitespace-nowrap"
                                >
                                  {isHeaderRow ? todayDateLabel : '—'}
                                </td>
                              );
                            }

                            return (
                              <td
                                key={colIdx}
                                className="border-b border-r border-gray-200 px-3 py-2.5 text-gray-700"
                              />
                            );
                          }

                          return (
                            <td
                              key={colIdx}
                              className={`border-b border-r border-gray-200 py-2.5 text-gray-700 truncate ${
                                isSeqCol ? 'w-14 min-w-[56px] max-w-[64px] px-2 text-center font-mono' : 'px-3.5 max-w-[240px]'
                              } ${
                                isIdColumn ? 'bg-blue-50/50 font-semibold text-black font-mono' : ''
                              }`}
                            >
                              {val !== undefined && val !== null && String(val).trim() !== ''
                                ? String(val)
                                : ''}
                            </td>
                          );
                        })}

                        {/* Sticky Right-locked Purple Summary Cell */}
                        <td className={`sticky right-0 z-10 border-b border-l border-purple-100 px-4 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_12px_rgba(139,92,246,0.1)] ${
                          isHeaderRow
                            ? 'bg-purple-100/80 text-purple-900 font-semibold text-xs'
                            : isStudentRow
                            ? 'bg-[#f5f3ff]'
                            : 'bg-white text-gray-300'
                        }`}>
                          {isHeaderRow ? (
                            'มา / สาย / ขาด'
                          ) : isStudentRow ? (
                            stats ? (
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold">
                                <span
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  title={`มาตรงเวลา: ${stats.onTime} ครั้ง`}
                                >
                                  {stats.onTime}
                                </span>
                                <span className="text-gray-300 font-normal">/</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    stats.late > 0
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                                      : 'bg-gray-50 text-gray-400 border-gray-200'
                                  }`}
                                  title={`มาสาย: ${stats.late} ครั้ง`}
                                >
                                  {stats.late}
                                </span>
                                <span className="text-gray-300 font-normal">/</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    stats.absent > 0
                                      ? 'bg-rose-50 text-rose-600 border-rose-200 font-bold'
                                      : 'bg-gray-50 text-gray-400 border-gray-200'
                                  }`}
                                  title={`ขาดเรียน: ${stats.absent} ครั้ง`}
                                >
                                  {stats.absent}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 font-mono text-xs">0 / 0 / 0</span>
                            )
                          ) : (
                            ''
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
