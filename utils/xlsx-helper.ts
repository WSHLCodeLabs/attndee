/**
 * KU myKU Roster Spreadsheet Parser & Exporter Helper
 * 
 * Purpose: Robust parser for Kasetsart University (KU) myKU roster spreadsheets
 * (Excel .xlsx / .xls / .csv) and generic student attendance spreadsheets.
 * Preserves full spreadsheet layout and headers/footers upon export.
 */

import * as XLSX from 'xlsx';
import { KURosterStudent, CourseMetadata } from '@/utils/supabase';

export const DEFAULT_FINGERPRINT_COL_INDEX = 37; // Column AL
export const LEGACY_FINGERPRINT_COL_INDEX = 25; // Legacy Column Z

export function isFingerprintHeader(val: string): boolean {
  return /^(fingerprint|attndee_fp|device_fp)$/i.test(String(val ?? '').trim());
}

export function isSummaryHeader(val: string): boolean {
  return /^(รวม|รวมคะแนน|รวม\s*\(.*\)|คะแนนรวม|total|sum)$/i.test(String(val ?? '').trim());
}

export function isStudentMetadataHeader(val: string): boolean {
  const v = String(val ?? '').trim().toLowerCase();
  if (!v) return false;
  return (
    v.includes('ลำดับ') ||
    v === 'seq' ||
    v === 'no' ||
    v === 'no.' ||
    v.includes('รหัส') ||
    v.includes('student') ||
    v === 'id' ||
    v.includes('ชื่อ') ||
    v.includes('name') ||
    v.includes('คณะ') ||
    v.includes('faculty') ||
    v.includes('สาขา') ||
    v.includes('major') ||
    v.includes('สถานะ') ||
    v.includes('status') ||
    v.includes('email') ||
    v.includes('google') ||
    v.includes('office') ||
    v.includes('365') ||
    v.includes('live') ||
    v.includes('ku.th')
  );
}

export interface ParsedRosterResult {
  isKuFormat: boolean;
  suggestedRoomName: string;
  courseMeta: CourseMetadata;
  students: KURosterStudent[];
  columnHeaders: string[];
  selectedIdColumn: string;
  nextAttendanceColIndex: number;
  nextAttendanceColumn: string;
  rawGrid: any[][];
  xlsxBase64?: string;
}

export interface ExportXlsxOptions {
  xlsxData: any[][];
  xlsxBase64?: string;
  courseMeta?: CourseMetadata;
  idColumn?: string;
  checkedInIds: Set<string> | string[];
  lateIds?: Set<string> | string[];
  extraStudents?: Array<{
    student_id: string;
    first_name: string;
    last_name: string;
    checkin_time?: string;
  }>;
  filename?: string;
  dateLabel?: string;
  lateScore?: number; // e.g. 0.5 (default), numeric score for late check-in
  studentFingerprints?: Record<string, string>; // map of student_id -> device_fingerprint
  includeSummaryColumn?: boolean; // when true (local download), appends 'รวม' total column at the end of attendance columns
  appendNewAttendanceColumn?: boolean; // default true; when false, only appends 'รวม' summary column over existing attendance columns
}

/**
 * Convert a 0-based column index to an Excel column letter (0 -> 'A', 25 -> 'Z', 26 -> 'AA')
 */
export function getColumnLetter(colIndex: number): string {
  if (colIndex < 0) return 'A';
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Convert an Excel column letter to a 0-based column index ('A' -> 0, 'Z' -> 25, 'AA' -> 26)
 */
export function getColumnIndex(colLetter: string): number {
  if (!colLetter) return 0;
  const clean = colLetter.trim().toUpperCase();
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 64; // 'A' = 1
    if (code < 1 || code > 26) return 0;
    index = index * 26 + code;
  }
  return Math.max(0, index - 1);
}

/**
 * Helper to split full Thai / English name into clean first_name and last_name,
 * stripping common Thai prefixes (นาย, นางสาว, น.ส., ว่าที่ ร.ต., ด.ช., etc.)
 * or English prefixes (Mr., Miss, Ms., Mrs.)
 */
export function splitStudentName(
  nameTh: string,
  nameEn?: string
): { first_name: string; last_name: string } {
  const cleanTh = (nameTh || '').trim();
  const cleanEn = (nameEn || '').trim();

  const thaiPrefixes = [
    'ว่าที่ ร.ต. หญิง',
    'ว่าที่ ร.ต.หญิง',
    'ว่าที่ร้อยตรีหญิง',
    'ว่าที่ ร.ต.',
    'ว่าที่ร้อยตรี',
    'นางสาว',
    'น.ส.',
    'นาย',
    'นาง',
    'ด.ช.',
    'ด.ญ.',
    'ด.ช',
    'ด.ญ',
    'อาจารย์',
    'อ.',
    'ผศ.ดร.',
    'ผศ.',
    'รศ.ดร.',
    'รศ.',
    'ศ.ดร.',
    'ศ.',
  ];

  let strippedTh = cleanTh;
  for (const prefix of thaiPrefixes) {
    if (strippedTh.startsWith(prefix)) {
      strippedTh = strippedTh.slice(prefix.length).trim();
      break;
    }
  }

  const thParts = strippedTh.split(/\s+/).filter(Boolean);
  if (thParts.length >= 2) {
    return {
      first_name: thParts[0],
      last_name: thParts.slice(1).join(' '),
    };
  } else if (thParts.length === 1 && thParts[0].length > 0) {
    return {
      first_name: thParts[0],
      last_name: '',
    };
  }

  // Fallback to English name if Thai is empty or couldn't be parsed
  if (cleanEn) {
    const enPrefixes = ['Mr.', 'Mr', 'Miss', 'Mrs.', 'Mrs', 'Ms.', 'Ms'];
    let strippedEn = cleanEn;
    for (const prefix of enPrefixes) {
      const regex = new RegExp(`^${prefix}\\s*`, 'i');
      if (regex.test(strippedEn)) {
        strippedEn = strippedEn.replace(regex, '').trim();
        break;
      }
    }
    const enParts = strippedEn.split(/\s+/).filter(Boolean);
    if (enParts.length >= 2) {
      return {
        first_name: enParts[0],
        last_name: enParts.slice(1).join(' '),
      };
    } else if (enParts.length === 1) {
      return {
        first_name: enParts[0],
        last_name: '',
      };
    }
  }

  return { first_name: '', last_name: '' };
}

/**
 * Convert an ArrayBuffer or Uint8Array to a base64 string safely across browser & Node
 */
export function arrayBufferToBase64(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to a Uint8Array safely across browser & Node
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parse an Excel / CSV buffer or binary string into a ParsedRosterResult.
 * Forces 0-based (A1) origin so sheets whose first cell is B2 do not get shifted!
 */
export function parseSpreadsheetBuffer(
  data: ArrayBuffer | string,
  type?: 'array' | 'binary' | 'string'
): ParsedRosterResult {
  const readType = type || (typeof data === 'string' ? 'binary' : 'array');
  const workbook = XLSX.read(data, { type: readType });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Spreadsheet contains no sheets');
  }
  const worksheet = workbook.Sheets[sheetName];

  // CRITICAL: Ensure range starts at A1 (r: 0, c: 0) even if the file's <dimension> starts at B2!
  let sheetRange: XLSX.Range | undefined;
  if (worksheet['!ref']) {
    const decoded = XLSX.utils.decode_range(worksheet['!ref']);
    sheetRange = {
      s: { r: 0, c: 0 },
      e: decoded.e,
    };
  }

  const rawGrid = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
    ...(sheetRange ? { range: sheetRange } : {}),
  }) as any[][];

  let xlsxBase64: string | undefined;
  if (data instanceof ArrayBuffer) {
    xlsxBase64 = arrayBufferToBase64(data);
  } else if (typeof data === 'string' && readType === 'binary') {
    if (typeof Buffer !== 'undefined') {
      xlsxBase64 = Buffer.from(data, 'binary').toString('base64');
    } else if (typeof btoa !== 'undefined') {
      xlsxBase64 = btoa(data);
    }
  }

  const parsed = parseRosterGrid(rawGrid);
  parsed.xlsxBase64 = xlsxBase64;
  return parsed;
}

/**
 * Core Parser: Scans a 2D grid of spreadsheet rows, extracts KU course metadata,
 * detects header rows and student ID columns, and parses individual student records.
 */
export function parseRosterGrid(
  rawGrid: any[][],
  manualIdColIndex?: number
): ParsedRosterResult {
  if (!rawGrid || !Array.isArray(rawGrid) || rawGrid.length === 0) {
    return {
      isKuFormat: false,
      suggestedRoomName: '',
      courseMeta: {
        is_ku_format: false,
        header_row_index: 0,
        id_col_index: 0,
        name_th_col_index: 1,
      },
      students: [],
      columnHeaders: ['A', 'B'],
      selectedIdColumn: 'A',
      nextAttendanceColIndex: 1,
      nextAttendanceColumn: 'B',
      rawGrid: [],
    };
  }

  let isKuFormat = false;
  let courseCode: string | undefined;
  let courseName: string | undefined;
  let fullTitle: string | undefined;
  let section: string | undefined;
  let credits: string | undefined;
  let campus: string | undefined;
  let semesterInfo: string | undefined;
  let instructor: string | undefined;

  // 1. Scan rows 0..15 for KU Course Metadata
  const scanLimit = Math.min(rawGrid.length, 25);
  for (let r = 0; r < scanLimit; r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] ?? '').trim();
      if (!cellText) continue;

      // Detect KU markers
      if (cellText.includes('รายงานแสดงจำนวนนิสิต')) {
        isKuFormat = true;
        semesterInfo = cellText;
      }
      if (cellText.includes('มหาวิทยาลัยเกษตรศาสตร์')) {
        isKuFormat = true;
        campus = cellText;
      }

      // Course name and code
      if (cellText === 'ชื่อวิชา' || cellText.includes('ชื่อวิชา')) {
        isKuFormat = true;
        // Next non-empty cell in row contains course code + title
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const nextVal = String(row[nextC] ?? '').trim();
          if (nextVal) {
            fullTitle = nextVal;
            // Course code: e.g. 01418362-65 or 01418362
            const codeMatch = fullTitle.match(/^([0-9]{6,10}(?:-[0-9]{2,4})?|[A-Za-z0-9_-]+)/);
            if (codeMatch) {
              courseCode = codeMatch[1];
              const remaining = fullTitle.slice(courseCode.length).trim();
              const thaiMatch = remaining.match(/([\u0E00-\u0E7F][\u0E00-\u0E7F\s]*)/);
              courseName = thaiMatch ? thaiMatch[1].trim() : remaining;
            } else {
              courseName = fullTitle;
            }
            break;
          }
        }
      }

      // Section and credits
      if (cellText === 'หมู่เรียน' || cellText.includes('หมู่เรียน')) {
        isKuFormat = true;
        let foundSection = false;
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const nextVal = String(row[nextC] ?? '').trim();
          if (nextVal) {
            if (!foundSection) {
              section = nextVal;
              foundSection = true;
            } else {
              credits = nextVal;
              break;
            }
          }
        }
      }

      // Instructor in header or footer
      if (cellText.includes('ผู้พิมพ์รายงาน')) {
        const afterText = cellText.replace(/^.*ผู้พิมพ์รายงาน\s*:?/, '').trim();
        if (afterText) {
          instructor = afterText;
        } else {
          // Check next cell
          for (let nextC = c + 1; nextC < row.length; nextC++) {
            const nextVal = String(row[nextC] ?? '').trim();
            if (nextVal) {
              instructor = nextVal;
              break;
            }
          }
        }
      }
    }
  }

  // Also scan bottom rows for instructor footer if not yet found
  if (!instructor && rawGrid.length > scanLimit) {
    const bottomLimit = Math.max(scanLimit, rawGrid.length - 10);
    for (let r = bottomLimit; r < rawGrid.length; r++) {
      const row = rawGrid[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] ?? '').trim();
        if (cellText.includes('ผู้พิมพ์รายงาน')) {
          const afterText = cellText.replace(/^.*ผู้พิมพ์รายงาน\s*:?/, '').trim();
          if (afterText) {
            instructor = afterText;
          } else {
            for (let nextC = c + 1; nextC < row.length; nextC++) {
              const nextVal = String(row[nextC] ?? '').trim();
              if (nextVal) {
                instructor = nextVal;
                break;
              }
            }
          }
        }
      }
    }
  }

  // 2. Auto-detect Header Row and Columns
  let headerRowIndex = -1;
  let idColIndex = -1;
  let nameThColIndex = -1;
  let nameEnColIndex: number | undefined;
  let seqColIndex: number | undefined;
  let facultyColIndex: number | undefined;
  let majorColIndex: number | undefined;
  let majorCodeColIndex: number | undefined;
  let statusColIndex: number | undefined;
  let emailGoogleColIndex: number | undefined;
  let emailOffice365ColIndex: number | undefined;
  let fingerprintColIndex: number = DEFAULT_FINGERPRINT_COL_INDEX;
  let sourceFpColIndex: number = -1;

  for (let r = 0; r < Math.min(rawGrid.length, 20); r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] ?? '').trim().toLowerCase();
      if (
        val === 'รหัสนิสิต' ||
        val === 'รหัสนักศึกษา' ||
        val === 'student id' ||
        val === 'student_id' ||
        val === 'studentid' ||
        val === 'student no' ||
        val === 'student_no' ||
        val === 'id'
      ) {
        headerRowIndex = r;
        idColIndex = c;
        if (val.includes('รหัส')) isKuFormat = true;
        break;
      }
    }
    if (headerRowIndex >= 0) break;
  }

  // If header row found, inspect all its columns
  if (headerRowIndex >= 0) {
    const headerRow = rawGrid[headerRowIndex];
    let nameThFound = false;

    for (let c = 0; c < headerRow.length; c++) {
      const val = String(headerRow[c] ?? '').trim();
      const valLower = val.toLowerCase();

      // Sequence
      if (val.includes('ลำดับ') || valLower === 'seq' || valLower === 'no' || valLower === 'no.') {
        seqColIndex = c;
      }

      // Names (KU has two 'ชื่อ-นามสกุล' columns: Thai first, English second)
      if (val.includes('ชื่อ-นามสกุล') || val.includes('ชื่อ') || valLower === 'name' || valLower === 'full name') {
        if (!nameThFound) {
          nameThColIndex = c;
          nameThFound = true;
        } else if (nameEnColIndex === undefined) {
          nameEnColIndex = c;
        }
      } else if (valLower.includes('english') || valLower.includes('name_en') || valLower.includes('name en')) {
        nameEnColIndex = c;
      }

      // Faculty
      if (val.includes('คณะ') || valLower.includes('faculty')) {
        facultyColIndex = c;
      }

      // Major
      if (val.includes('สาขาวิชา') || (val.includes('สาขา') && !val.includes('รหัสสาขา')) || valLower.includes('major')) {
        majorColIndex = c;
      }

      // Major Code
      if (val.includes('รหัสสาขา')) {
        majorCodeColIndex = c;
      }

      // Status
      if (val.includes('สถานะ') || valLower.includes('status')) {
        statusColIndex = c;
      }

      // Emails
      if (valLower.includes('google') || valLower.includes('ku.th')) {
        emailGoogleColIndex = c;
      }
      if (valLower.includes('office') || valLower.includes('365') || valLower.includes('live')) {
        emailOffice365ColIndex = c;
      }

      // Fingerprint column (may exist at legacy Z=25 or AL=37)
      if (isFingerprintHeader(val)) {
        sourceFpColIndex = c;
        fingerprintColIndex = Math.max(DEFAULT_FINGERPRINT_COL_INDEX, c);
      }
    }
  }

  // If not explicitly detected in header, check if column AL (37) or legacy Z (25) contains 12-32 char hex strings
  if (sourceFpColIndex < 0) {
    const startScan = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    const endScan = Math.min(rawGrid.length, startScan + 30);
    for (const candidateCol of [DEFAULT_FINGERPRINT_COL_INDEX, LEGACY_FINGERPRINT_COL_INDEX]) {
      let hexCount = 0;
      for (let r = startScan; r < endScan; r++) {
        const cell = String(rawGrid[r]?.[candidateCol] ?? '').trim();
        if (/^[0-9a-f]{12,32}$/i.test(cell)) {
          hexCount++;
        }
      }
      if (hexCount > 0) {
        sourceFpColIndex = candidateCol;
        fingerprintColIndex = Math.max(DEFAULT_FINGERPRINT_COL_INDEX, candidateCol);
        break;
      }
    }
  }

  // Fallback: If no header row was detected by keywords, scan columns for 8-12 digit numbers
  if (idColIndex < 0) {
    const maxCols = Math.max(...rawGrid.map((r) => (Array.isArray(r) ? r.length : 0)), 1);
    let bestCol = -1;
    let maxCount = 0;

    for (let c = 0; c < maxCols; c++) {
      let count = 0;
      for (let r = 0; r < rawGrid.length; r++) {
        const cell = String(rawGrid[r]?.[c] ?? '').trim();
        if (/^\d{8,12}$/.test(cell)) {
          count++;
        }
      }
      if (count > maxCount) {
        maxCount = count;
        bestCol = c;
      }
    }

    if (bestCol >= 0) {
      idColIndex = bestCol;
      // Header row is row before first student ID, or 0
      for (let r = 0; r < rawGrid.length; r++) {
        const cell = String(rawGrid[r]?.[bestCol] ?? '').trim();
        if (/^\d{8,12}$/.test(cell)) {
          headerRowIndex = Math.max(0, r - 1);
          break;
        }
      }
      if (headerRowIndex < 0) headerRowIndex = 0;
    } else {
      headerRowIndex = 0;
      idColIndex = 0;
    }
  }

  // Manual override for ID column if specified
  if (manualIdColIndex !== undefined && manualIdColIndex >= 0) {
    idColIndex = manualIdColIndex;
  }

  if (nameThColIndex < 0) {
    nameThColIndex = idColIndex + 1;
  }

  // 3. Extract Students
  const students: KURosterStudent[] = [];
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let r = startRow; r < rawGrid.length; r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Check if footer row
    const rowString = row.map((c) => String(c ?? '')).join(' ');
    if (
      rowString.includes('วันเวลาที่พิมพ์รายงาน') ||
      rowString.includes('ผู้พิมพ์รายงาน') ||
      rowString.includes('สรุปทั้งหมด')
    ) {
      continue;
    }

    const rawId = row[idColIndex];
    const studentId = String(rawId ?? '').trim();
    if (!studentId) continue;

    // Skip if cell equals header text
    if (
      studentId === 'รหัสนิสิต' ||
      studentId === 'รหัสนักศึกษา' ||
      studentId.toLowerCase() === 'student id' ||
      studentId.toLowerCase() === 'id'
    ) {
      continue;
    }

    // Validation: KU student IDs are 8-12 digits. Generic files accept alphanumeric IDs.
    if (isKuFormat) {
      if (!/^\d{7,13}$/.test(studentId)) {
        continue;
      }
    } else {
      if (!/^[A-Za-z0-9_-]{4,25}$/.test(studentId)) {
        continue;
      }
    }

    const nameTh = String(row[nameThColIndex] ?? '').trim();
    const nameEn =
      nameEnColIndex !== undefined && nameEnColIndex >= 0
        ? String(row[nameEnColIndex] ?? '').trim()
        : undefined;

    const { first_name, last_name } = splitStudentName(nameTh, nameEn);

    const fpReadIndex = sourceFpColIndex >= 0 ? sourceFpColIndex : fingerprintColIndex;
    const rawFp = String(row[fpReadIndex] || row[fingerprintColIndex] || '').trim();
    const deviceFingerprint =
      rawFp && !isFingerprintHeader(rawFp) && rawFp.toLowerCase() !== 'unknown'
        ? rawFp
        : undefined;

    students.push({
      row_index: r,
      seq: seqColIndex !== undefined ? row[seqColIndex] : undefined,
      student_id: studentId,
      name_th: nameTh,
      name_en: nameEn,
      first_name,
      last_name,
      faculty: facultyColIndex !== undefined ? String(row[facultyColIndex] ?? '').trim() : undefined,
      major: majorColIndex !== undefined ? String(row[majorColIndex] ?? '').trim() : undefined,
      major_code: majorCodeColIndex !== undefined ? String(row[majorCodeColIndex] ?? '').trim() : undefined,
      status: statusColIndex !== undefined ? String(row[statusColIndex] ?? '').trim() : undefined,
      email_google: emailGoogleColIndex !== undefined ? String(row[emailGoogleColIndex] ?? '').trim() : undefined,
      email_office365: emailOffice365ColIndex !== undefined ? String(row[emailOffice365ColIndex] ?? '').trim() : undefined,
      device_fingerprint: deviceFingerprint,
    });
  }

  // 4. Build Clean Suggested Room Name
  let suggestedRoomName = '';
  if (courseCode && (courseName || fullTitle)) {
    const sectionNum = section ? (section.match(/\d+/)?.[0] || section) : '';
    const sectionSuffix = sectionNum ? `(หมู่ ${sectionNum})` : '';
    suggestedRoomName = `${courseCode} ${courseName || fullTitle} ${sectionSuffix}`.replace(/\s+/g, ' ').trim();
  } else if (courseName) {
    suggestedRoomName = courseName.trim();
  }

  // 5. Calculate Next Attendance Column (first empty column after table headers & prior dates,
  // ignoring any legacy 'Fingerprint' column or previous 'รวม' summary column)
  const effectiveHeaderRow = Math.max(0, headerRowIndex);
  let lastNonEmptyBeforeFp = idColIndex;
  for (let c = idColIndex; c < fingerprintColIndex; c++) {
    const cellVal = String(rawGrid[effectiveHeaderRow]?.[c] ?? '').trim();
    if (cellVal !== '' && !isFingerprintHeader(cellVal) && !isSummaryHeader(cellVal)) {
      lastNonEmptyBeforeFp = c;
    }
  }
  const nextAttendanceColIndex = lastNonEmptyBeforeFp + 1;
  const nextAttendanceColumn = getColumnLetter(nextAttendanceColIndex);

  // 6. Build Column Headers ('A', 'B', 'C', ...)
  const maxCols = Math.max(
    ...rawGrid.map((r) => (Array.isArray(r) ? r.length : 0)),
    nextAttendanceColIndex + 1,
    fingerprintColIndex + 1,
    1
  );
  const columnHeaders = Array.from({ length: maxCols }, (_, i) => getColumnLetter(i));
  const selectedIdColumn = getColumnLetter(idColIndex);

  const courseMeta: CourseMetadata = {
    is_ku_format: isKuFormat,
    course_code: courseCode,
    course_name: courseName,
    full_title: fullTitle,
    section,
    credits,
    campus,
    semester_info: semesterInfo,
    instructor,
    header_row_index: effectiveHeaderRow,
    id_col_index: idColIndex,
    name_th_col_index: nameThColIndex,
    name_en_col_index: nameEnColIndex,
    status_col_index: statusColIndex,
    fingerprint_col_index: fingerprintColIndex,
  };

  return {
    isKuFormat,
    suggestedRoomName,
    courseMeta,
    students,
    columnHeaders,
    selectedIdColumn,
    nextAttendanceColIndex,
    nextAttendanceColumn,
    rawGrid,
  };
}

/**
 * Build an updated 2D spreadsheet grid with an appended attendance column,
 * preserving all existing KU header rows, student rows, and footer rows.
 * Attendance scores are written as NUMERIC values: 1 for present, 0 for absent,
 * and lateScore (e.g. 0.5) for late arrivals.
 * When options.includeSummaryColumn is true, appends a 'รวม' total column immediately
 * after the latest attendance date column, and places 'Fingerprint' at Column AL (37).
 */
export function buildUpdatedXlsxGrid(options: ExportXlsxOptions): any[][] {
  const {
    xlsxData,
    courseMeta,
    idColumn,
    checkedInIds,
    lateIds,
    extraStudents,
    dateLabel,
    lateScore = 0.5,
    includeSummaryColumn = false,
    appendNewAttendanceColumn = true,
  } = options;

  if (!xlsxData || !Array.isArray(xlsxData) || xlsxData.length === 0) {
    return [];
  }

  // Deep clone xlsxData so original grid is preserved
  const grid: any[][] = xlsxData.map((row) => (Array.isArray(row) ? [...row] : []));

  // Normalize check-in sets (trimmed for bulletproof matching)
  const checkedInSet = new Set<string>();
  if (checkedInIds) {
    if (checkedInIds instanceof Set) {
      checkedInIds.forEach((id) => checkedInSet.add(String(id).trim()));
    } else if (Array.isArray(checkedInIds)) {
      checkedInIds.forEach((id) => checkedInSet.add(String(id).trim()));
    }
  }

  const lateSet = new Set<string>();
  if (lateIds) {
    if (lateIds instanceof Set) {
      lateIds.forEach((id) => lateSet.add(String(id).trim()));
    } else if (Array.isArray(lateIds)) {
      lateIds.forEach((id) => lateSet.add(String(id).trim()));
    }
  }

  // Determine idColIndex reliably
  let idColIndex = -1;
  if (courseMeta?.id_col_index !== undefined && courseMeta.id_col_index >= 0) {
    idColIndex = courseMeta.id_col_index;
  } else if (idColumn) {
    idColIndex = getColumnIndex(idColumn);
  }

  // Fallback auto-detection if still invalid
  if (idColIndex < 0) {
    let bestCol = -1;
    let maxDigits = 0;
    const maxCols = Math.max(...grid.map((r) => r.length), 0);
    for (let c = 0; c < maxCols; c++) {
      let count = 0;
      for (const row of grid) {
        if (/^\d{8,12}$/.test(String(row[c] ?? '').trim())) count++;
      }
      if (count > maxDigits) {
        maxDigits = count;
        bestCol = c;
      }
    }
    idColIndex = bestCol >= 0 ? bestCol : 0;
  }

  // Determine headerRowIndex
  let headerRowIndex = courseMeta?.header_row_index ?? -1;
  if (headerRowIndex < 0) {
    for (let r = 0; r < Math.min(grid.length, 20); r++) {
      const rowStr = (grid[r] || []).map((c) => String(c ?? '')).join(' ');
      if (
        rowStr.includes('รหัสนิสิต') ||
        rowStr.includes('รหัสนักศึกษา') ||
        /student.*id/i.test(rowStr)
      ) {
        headerRowIndex = r;
        break;
      }
    }
    if (headerRowIndex < 0) headerRowIndex = 0;
  }

  // Ensure header row exists
  while (grid.length <= headerRowIndex) {
    grid.push([]);
  }

  // Determine target fpColIndex (minimum DEFAULT_FINGERPRINT_COL_INDEX = 37 = Column AL)
  let fpColIndex = Math.max(
    DEFAULT_FINGERPRINT_COL_INDEX,
    courseMeta?.fingerprint_col_index ?? DEFAULT_FINGERPRINT_COL_INDEX
  );

  // Detect any legacy fingerprint columns (< fpColIndex, e.g. Column Z = 25) or prior summary columns
  const legacyFpCols: number[] = [];
  const staleSummaryCols: number[] = [];
  for (let c = idColIndex + 1; c < fpColIndex; c++) {
    const hVal = String(grid[headerRowIndex]?.[c] ?? '').trim();
    if (isFingerprintHeader(hVal)) {
      legacyFpCols.push(c);
    } else if (isSummaryHeader(hVal)) {
      staleSummaryCols.push(c);
    }
  }

  // CRITICAL Attendance Column Placement:
  // Find the last non-empty header column strictly before fpColIndex, ignoring legacy Fingerprint and 'รวม' headers
  let lastNonEmptyBeforeFp = idColIndex;
  for (let c = idColIndex; c < fpColIndex; c++) {
    const cellVal = String(grid[headerRowIndex]?.[c] ?? '').trim();
    if (cellVal !== '' && !isFingerprintHeader(cellVal) && !isSummaryHeader(cellVal)) {
      lastNonEmptyBeforeFp = c;
    }
  }
  const appendColIndex = appendNewAttendanceColumn ? lastNonEmptyBeforeFp + 1 : -1;
  const summaryColIndex = includeSummaryColumn
    ? appendColIndex >= 0
      ? appendColIndex + 1
      : lastNonEmptyBeforeFp + 1
    : -1;

  // If the table ever grows to reach or exceed fpColIndex, shift fpColIndex further right
  const lastRequiredBeforeFp = Math.max(appendColIndex, summaryColIndex, lastNonEmptyBeforeFp);
  if (lastRequiredBeforeFp >= fpColIndex) {
    fpColIndex = lastRequiredBeforeFp + 5;
  }

  // Clear any legacy Fingerprint or stale Summary headers that aren't being overwritten right now
  for (const oldCol of [...legacyFpCols, ...staleSummaryCols]) {
    if (oldCol !== appendColIndex && oldCol !== summaryColIndex && oldCol !== fpColIndex) {
      if (grid[headerRowIndex]?.[oldCol] !== undefined) {
        grid[headerRowIndex][oldCol] = '';
      }
    }
  }

  // Ensure header row has sufficient length to hold appendColIndex, summaryColIndex, and fpColIndex
  const maxHeaderCol = Math.max(appendColIndex, summaryColIndex, fpColIndex);
  while (grid[headerRowIndex].length <= maxHeaderCol) {
    grid[headerRowIndex].push('');
  }

  // Write column header label (e.g., '14/10/2569' or custom dateLabel), optional 'รวม', and 'Fingerprint' at AL
  const todayLabel = dateLabel || new Date().toLocaleDateString('th-TH');
  if (appendColIndex >= 0) {
    grid[headerRowIndex][appendColIndex] = todayLabel;
  }
  if (summaryColIndex >= 0) {
    grid[headerRowIndex][summaryColIndex] = 'รวม';
  }
  grid[headerRowIndex][fpColIndex] = 'Fingerprint';

  // Identify all attendance date columns (up to and including appendColIndex or lastNonEmptyBeforeFp) for summing into 'รวม'
  const maxAttScanCol = appendColIndex >= 0 ? appendColIndex : lastNonEmptyBeforeFp;
  const attendanceColIndices: number[] = [];
  for (let c = idColIndex + 1; c <= maxAttScanCol; c++) {
    if (c === appendColIndex) {
      attendanceColIndices.push(c);
      continue;
    }
    const hVal = String(grid[headerRowIndex]?.[c] ?? '').trim();
    if (
      hVal !== '' &&
      !isStudentMetadataHeader(hVal) &&
      !isFingerprintHeader(hVal) &&
      !isSummaryHeader(hVal)
    ) {
      attendanceColIndices.push(c);
    }
  }

  // Helper to compute numeric sum across all attendance columns for a student row
  const computeStudentTotalScore = (row: any[]): number => {
    let sum = 0;
    for (const attCol of attendanceColIndices) {
      const v = row[attCol];
      const num = typeof v === 'number' ? v : parseFloat(String(v ?? '').trim());
      if (!Number.isNaN(num)) {
        sum += num;
      }
    }
    return Math.round(sum * 100) / 100;
  };

  // Track which IDs were present in the spreadsheet
  const matchedStudentIds = new Set<string>();

  // Process rows from headerRowIndex + 1 onwards
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map((c) => String(c ?? '')).join(' ');
    // Skip KU footer rows (do not assign 0 or 1 to summary/footer cells)
    if (
      rowStr.includes('วันเวลาที่พิมพ์รายงาน') ||
      rowStr.includes('ผู้พิมพ์รายงาน') ||
      rowStr.includes('สรุปทั้งหมด')
    ) {
      continue;
    }

    const rawId = row[idColIndex];
    const studentId = String(rawId ?? '').trim();
    if (!studentId) continue;

    // Check if cell resembles a student ID
    const isIdLike = /^\d{7,13}$/.test(studentId) || /^[A-Za-z0-9_-]{4,20}$/.test(studentId);
    if (!isIdLike || studentId.toLowerCase() === 'student id' || studentId === 'รหัสนิสิต') {
      continue;
    }

    matchedStudentIds.add(studentId);

    // Harvest any existing fingerprint from legacy Z column before clearing it
    let existingLegacyFp = '';
    for (const oldFpCol of legacyFpCols) {
      const candidate = String(row[oldFpCol] ?? '').trim();
      if (candidate && !isFingerprintHeader(candidate) && candidate.toLowerCase() !== 'unknown') {
        existingLegacyFp = candidate;
      }
      if (oldFpCol !== appendColIndex && oldFpCol !== summaryColIndex && oldFpCol !== fpColIndex) {
        row[oldFpCol] = '';
      }
    }
    for (const oldSumCol of staleSummaryCols) {
      if (oldSumCol !== appendColIndex && oldSumCol !== summaryColIndex && oldSumCol !== fpColIndex) {
        row[oldSumCol] = '';
      }
    }

    // Ensure row has sufficient length to hold appendColIndex, summaryColIndex, and fpColIndex
    const targetRowLength = Math.max(appendColIndex, summaryColIndex, fpColIndex) + 1;
    while (row.length < targetRowLength) {
      row.push('');
    }

    // Assign numeric attendance score (number, NOT string, so Excel SUM works!)
    if (appendColIndex >= 0) {
      if (checkedInSet.has(studentId)) {
        if (lateSet.has(studentId) && lateScore !== undefined) {
          row[appendColIndex] = Number(lateScore);
        } else {
          row[appendColIndex] = 1;
        }
      } else {
        row[appendColIndex] = 0;
      }
    }

    // Write total attendance score in 'รวม' column when requested
    if (summaryColIndex >= 0) {
      row[summaryColIndex] = computeStudentTotalScore(row);
    }

    // Persist student device fingerprint in Column AL (fpColIndex = 37)
    const fp =
      options.studentFingerprints?.[studentId] ||
      String(row[fpColIndex] ?? '').trim() ||
      existingLegacyFp;
    if (fp && fp.toLowerCase() !== 'unknown' && !isFingerprintHeader(fp)) {
      row[fpColIndex] = fp;
    }
  }

  // Handle extra students who checked in but were not present in the original spreadsheet
  if (extraStudents && Array.isArray(extraStudents) && extraStudents.length > 0) {
    const unlistedStudents = extraStudents.filter(
      (extra) => !matchedStudentIds.has(String(extra.student_id).trim())
    );

    if (unlistedStudents.length > 0) {
      // Find insertion point before footer rows
      let footerInsertIdx = -1;
      for (let r = headerRowIndex + 1; r < grid.length; r++) {
        const rowStr = (grid[r] || []).map((c) => String(c ?? '')).join(' ');
        if (
          rowStr.includes('วันเวลาที่พิมพ์รายงาน') ||
          rowStr.includes('ผู้พิมพ์รายงาน') ||
          rowStr.includes('สรุปทั้งหมด')
        ) {
          footerInsertIdx = r;
          break;
        }
      }

      if (footerInsertIdx === -1) {
        footerInsertIdx = grid.length;
      }

      for (const extra of unlistedStudents) {
        const cleanExtraId = String(extra.student_id).trim();
        const targetRowLength = Math.max(appendColIndex, summaryColIndex, fpColIndex) + 1;
        const newRow: any[] = new Array(targetRowLength).fill('');
        newRow[idColIndex] = cleanExtraId;

        if (courseMeta?.name_th_col_index !== undefined && courseMeta.name_th_col_index >= 0) {
          newRow[courseMeta.name_th_col_index] = `${extra.first_name || ''} ${extra.last_name || ''}`.trim();
        }

        if (courseMeta?.status_col_index !== undefined && courseMeta.status_col_index >= 0) {
          newRow[courseMeta.status_col_index] = 'Extra (ไม่ได้อยู่ในรายชื่อ)';
        }

        const isLate = lateSet.has(cleanExtraId);
        if (checkedInSet.has(cleanExtraId)) {
          newRow[appendColIndex] = isLate && lateScore !== undefined ? Number(lateScore) : 1;
        } else {
          newRow[appendColIndex] = 0;
        }

        if (summaryColIndex >= 0) {
          newRow[summaryColIndex] = computeStudentTotalScore(newRow);
        }

        // Persist fingerprint for extra student
        const extraFp = options.studentFingerprints?.[cleanExtraId];
        if (extraFp && extraFp.toLowerCase() !== 'unknown') {
          newRow[fpColIndex] = extraFp;
        }

        grid.splice(footerInsertIdx, 0, newRow);
        footerInsertIdx++;
      }
    }
  }

  return grid;
}

/**
 * Escape XML special characters for OOXML cell strings
 */
function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Patch an original .xlsx file binary (ZIP archive) in-place by updating only
 * `xl/worksheets/sheet1.xml` with the newly added attendance column and fingerprint column.
 * Notice: Re-parses the 0-based grid directly from `xlsxBase64` so that even if a room was
 * created before the B2:K43 origin fix, the row and column coordinates are 100% accurate!
 */
export function buildPatchedXlsxBuffer(
  xlsxBase64: string,
  options: ExportXlsxOptions
): Uint8Array | null {
  try {
    const cfbLib = (XLSX as any).CFB;
    if (!cfbLib) return null;

    const rawBytes = base64ToUint8Array(xlsxBase64);
    const cfb = cfbLib.read(rawBytes, { type: 'array' });

    // Locate the first worksheet XML inside the zip archive
    const sheetEntry =
      cfbLib.find(cfb, '/xl/worksheets/sheet1.xml') ||
      cfbLib.find(cfb, 'xl/worksheets/sheet1.xml');

    if (!sheetEntry || !sheetEntry.content) return null;

    // Re-parse the binary directly with 0-based (A1) origin to guarantee exact coordinates
    const freshParsed = parseSpreadsheetBuffer(
      rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer,
      'array'
    );
    const courseMeta = freshParsed.courseMeta;
    const updatedGrid = buildUpdatedXlsxGrid({
      ...options,
      xlsxData: freshParsed.rawGrid,
      courseMeta: freshParsed.courseMeta,
      idColumn: freshParsed.selectedIdColumn,
    });

    let xml: string =
      typeof Buffer !== 'undefined' && Buffer.isBuffer(sheetEntry.content)
        ? sheetEntry.content.toString('utf8')
        : new TextDecoder('utf-8').decode(
            sheetEntry.content instanceof Uint8Array
              ? sheetEntry.content
              : new Uint8Array(sheetEntry.content)
          );

    const headerRowIdx = courseMeta.header_row_index ?? 6; // 0-based
    const idColIdx = courseMeta.id_col_index ?? 2;
    const shouldAppendDate = options.appendNewAttendanceColumn !== false;
    const appendColIdx = shouldAppendDate ? freshParsed.nextAttendanceColIndex : -1;
    const summaryColIdx = options.includeSummaryColumn
      ? shouldAppendDate
        ? appendColIdx + 1
        : freshParsed.nextAttendanceColIndex
      : -1;
    const lastReqBeforeFp = Math.max(appendColIdx, summaryColIdx, freshParsed.nextAttendanceColIndex - 1);
    const fpColIdx = Math.max(
      DEFAULT_FINGERPRINT_COL_INDEX,
      courseMeta.fingerprint_col_index ?? DEFAULT_FINGERPRINT_COL_INDEX,
      lastReqBeforeFp >= DEFAULT_FINGERPRINT_COL_INDEX
        ? lastReqBeforeFp + 5
        : DEFAULT_FINGERPRINT_COL_INDEX
    );

    // Detect any legacy fingerprint or stale summary columns in the original grid that were cleared
    const clearedCols: number[] = [];
    const origHeaderRow = freshParsed.rawGrid[headerRowIdx] || [];
    for (let c = idColIdx + 1; c < fpColIdx; c++) {
      const origH = String(origHeaderRow[c] ?? '').trim();
      if (
        (isFingerprintHeader(origH) || isSummaryHeader(origH)) &&
        c !== appendColIdx &&
        c !== summaryColIdx &&
        c !== fpColIdx
      ) {
        clearedCols.push(c);
      }
    }

    // Identify which columns in updatedGrid need to be written into the XML
    let maxColIdx = 0;
    for (const row of updatedGrid) {
      if (Array.isArray(row) && row.length - 1 > maxColIdx) {
        maxColIdx = row.length - 1;
      }
    }

    // Helper to build an OOXML <c> element for (rowIdx 0-based, colIdx 0-based)
    const buildCellXml = (r0: number, c0: number, val: any, styleIdx: string | null): string => {
      const cellRef = `${getColumnLetter(c0)}${r0 + 1}`;
      const sAttr = styleIdx !== null ? ` s="${styleIdx}"` : '';
      if (typeof val === 'number' && !Number.isNaN(val)) {
        return `<c r="${cellRef}"${sAttr}><v>${val}</v></c>`;
      }
      const strVal = String(val ?? '');
      return `<c r="${cellRef}"${sAttr} t="inlineStr"><is><t>${escapeXml(strVal)}</t></is></c>`;
    };

    // Helper to upsert a <c r="X#"> cell inside a <row ...>...</row> XML block
    const upsertCellInRowXml = (rowXml: string, cellRef: string, newCellXml: string): string => {
      const cellRegex = new RegExp(`<c\\s+r="${cellRef}"[^/>]*(?:/>|>[\\s\\S]*?<\\/c>)`);
      if (cellRegex.test(rowXml)) {
        return rowXml.replace(cellRegex, newCellXml);
      }
      return rowXml.replace('</row>', `${newCellXml}</row>`);
    };

    // CRITICAL OOXML RULE: Microsoft Excel strictly requires <c r="..."> elements inside a <row>
    // to appear in ascending column order (e.g. B, C, ..., K, L, M, ..., AL). If M appears after AL,
    // Excel marks sheet1.xml as unreadable and strips the cells.
    const sortRowCellsInXml = (rowXml: string): string => {
      return rowXml.replace(
        /^(<row\b[^>]*>)([\s\S]*?)(<\/row>)$/,
        (full, openTag, inner, closeTag) => {
          const cellRegex = /<c\b[^/>]*\br="([A-Z]+)\d+"[^/>]*(?:\/>|>[\s\S]*?<\/c>)/g;
          const cells: { colIdx: number; xml: string }[] = [];
          let m: RegExpExecArray | null;
          while ((m = cellRegex.exec(inner)) !== null) {
            cells.push({
              colIdx: getColumnIndex(m[1]),
              xml: m[0],
            });
          }
          if (cells.length <= 1) return full;
          cells.sort((a, b) => a.colIdx - b.colIdx);
          return `${openTag}${cells.map((c) => c.xml).join('')}${closeTag}`;
        }
      );
    };

    // Update each row in updatedGrid from headerRowIdx onwards
    for (let r0 = headerRowIdx; r0 < updatedGrid.length; r0++) {
      const row = updatedGrid[r0];
      if (!Array.isArray(row)) continue;

      const excelRowNum = r0 + 1;
      const rowRegex = new RegExp(`<row\\s+r="${excelRowNum}"[^>]*>[\\s\\S]*?<\\/row>`);
      const match = xml.match(rowRegex);
      if (!match) continue;

      let rowXml: string = match[0];

      // Remove any legacy Fingerprint (e.g. Column Z) or stale Summary cells that were migrated/cleared
      for (const clearedCol of clearedCols) {
        if (!row[clearedCol]) {
          const clearedRef = `${getColumnLetter(clearedCol)}${excelRowNum}`;
          const clearedRegex = new RegExp(`<c\\s+r="${clearedRef}"[^/>]*(?:/>|>[\\s\\S]*?<\\/c>)`);
          rowXml = rowXml.replace(clearedRegex, '');
        }
      }

      // Detect existing style index in this row so our appended cell matches existing borders & font!
      let rowStyle: string | null = null;
      if (r0 === headerRowIdx) {
        const headerStyleMatch = rowXml.match(/\bs="(\d+)"/);
        rowStyle = headerStyleMatch ? headerStyleMatch[1] : null;
      } else {
        const seqCellRef = `${getColumnLetter(Math.max(0, idColIdx - 1))}${excelRowNum}`;
        const seqStyleMatch = rowXml.match(new RegExp(`<c\\s+r="${seqCellRef}"\\s+s="(\\d+)"`));
        if (seqStyleMatch) {
          rowStyle = seqStyleMatch[1];
        } else {
          const anyStyleMatch = rowXml.match(/\bs="(\d+)"/);
          rowStyle = anyStyleMatch ? anyStyleMatch[1] : null;
        }
      }

      for (let c0 = idColIdx + 1; c0 < row.length; c0++) {
        const val = row[c0];
        if (val === '' || val === undefined || val === null) continue;

        const cellRef = `${getColumnLetter(c0)}${excelRowNum}`;
        const existingCellRegex = new RegExp(`<c\\s+r="${cellRef}"[^/>]*(?:/>|>[\\s\\S]*?<\\/c>)`);
        const existingMatch = rowXml.match(existingCellRegex);
        // Note: Excel often saves empty formatted cells as self-closing <c r="M7" s="7"/> without <v> or <is>.
        // Treat any cell without <v> or <is> as empty so attendance scores are always written!
        const hasExistingValue = Boolean(existingMatch && /<(?:v|is)\b/.test(existingMatch[0]));

        if (
          !hasExistingValue ||
          c0 === appendColIdx ||
          c0 === summaryColIdx ||
          c0 === fpColIdx
        ) {
          const cellXml = buildCellXml(r0, c0, val, rowStyle);
          rowXml = upsertCellInRowXml(rowXml, cellRef, cellXml);
        }
      }

      // Guarantee ascending column order (A..AL) inside <row> for Microsoft Excel OOXML compliance
      rowXml = sortRowCellsInXml(rowXml);

      // Update spans="2:11" attribute on <row> if present so Excel knows the new width
      rowXml = rowXml.replace(/spans="(\d+):(\d+)"/, (_m, startSpan) => {
        return `spans="${startSpan}:${maxColIdx + 1}"`;
      });

      xml = xml.replace(rowRegex, rowXml);
    }

    // Update <dimension ref="B2:K43" /> so Excel includes the new columns
    const maxRowNum = updatedGrid.length;
    const maxColLetter = getColumnLetter(maxColIdx);
    xml = xml.replace(/<dimension\s+ref="([A-Z]+\d+):[A-Z]+\d+"\s*\/>/, (_m, startRef) => {
      return `<dimension ref="${startRef}:${maxColLetter}${maxRowNum}" />`;
    });

    // Ensure the attendance and summary column(s) have a clean readable width in <cols> (e.g. width="13.5")
    // without creating overlapping min/max ranges
    if (xml.includes('</cols>')) {
      const target1BasedCols: number[] = [];
      if (appendColIdx >= 0) {
        target1BasedCols.push(appendColIdx + 1);
      }
      if (summaryColIdx >= 0) {
        target1BasedCols.push(summaryColIdx + 1);
      }
      xml = xml.replace(/<cols>([\s\S]*?)<\/cols>/, (_full, innerCols) => {
        const colRegex = /<col\b[^>]*\bmin="(\d+)"[^>]*\bmax="(\d+)"[^>]*\/>/g;
        const parsedCols: { min: number; max: number; xml: string }[] = [];
        let cm: RegExpExecArray | null;
        while ((cm = colRegex.exec(innerCols)) !== null) {
          parsedCols.push({
            min: Number(cm[1]),
            max: Number(cm[2]),
            xml: cm[0],
          });
        }
        // Remove any redundant single-col entry that is already covered by a wider range
        const cleanCols = parsedCols.filter(
          (c, idx) =>
            !parsedCols.some(
              (other, oIdx) =>
                oIdx !== idx &&
                other.min <= c.min &&
                c.max <= other.max &&
                (other.max - other.min > c.max - c.min || oIdx < idx)
            )
        );
        for (const col1Based of target1BasedCols) {
          const isCovered = cleanCols.some((c) => c.min <= col1Based && col1Based <= c.max);
          if (!isCovered) {
            cleanCols.push({
              min: col1Based,
              max: col1Based,
              xml: `<col min="${col1Based}" max="${col1Based}" width="13.5" customWidth="1" />`,
            });
          }
        }
        cleanCols.sort((a, b) => a.min - b.min);
        return `<cols>${cleanCols.map((c) => c.xml).join('')}</cols>`;
      });
    }

    const encodedXml =
      typeof Buffer !== 'undefined'
        ? Buffer.from(xml, 'utf8')
        : new TextEncoder().encode(xml);
    sheetEntry.content = encodedXml;
    sheetEntry.size = encodedXml.length;

    const outZip = cfbLib.write(cfb, { type: 'array', fileType: 'zip' });
    return outZip instanceof Uint8Array ? outZip : new Uint8Array(outZip);
  } catch (err) {
    console.warn('In-place XLSX XML patch failed, falling back to standard export:', err);
    return null;
  }
}

/**
 * Generate the updated XLSX workbook as a Blob (preserving binary KU layout when base64 is available)
 */
export function generateUpdatedXlsxBlob(options: ExportXlsxOptions): Blob {
  let base64Source = options.xlsxBase64;
  if (!base64Source && typeof window !== 'undefined') {
    try {
      base64Source = localStorage.getItem('attndee_latest_xlsx_base64') || undefined;
    } catch {}
  }

  // 1. If original .xlsx binary (base64Source) is available, patch the ZIP XML in-place
  // so the KU logo, TH SarabunPSK fonts, borders, merged cells, and layout remain 100% intact!
  if (base64Source) {
    const patchedBytes = buildPatchedXlsxBuffer(base64Source, options);
    if (patchedBytes) {
      return new Blob([patchedBytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
  }

  // 2. Fallback for generic spreadsheets when no binary is available
  let grid = buildUpdatedXlsxGrid(options);
  if (
    grid.length > 0 &&
    String(grid[0]?.[0] ?? '').includes('รายงานแสดงจำนวนนิสิต')
  ) {
    grid = [
      [],
      ...grid.map((row) => ['', ...(Array.isArray(row) ? row : [])]),
    ];
  }

  const worksheet = XLSX.utils.aoa_to_sheet(grid);
  worksheet['!cols'] = [
    { wch: 2 },
    { wch: 8 },
    { wch: 14 },
    { wch: 26 },
    { wch: 26 },
    { wch: 26 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 24 },
    { wch: 24 },
    { wch: 14 },
  ];
  worksheet['!merges'] = [
    { s: { r: 1, c: 1 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 6 } },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
  const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate and trigger download of the updated XLSX workbook in browser environments.
 * By default, local downloads include the 'รวม' summary column at the end of the attendance columns.
 */
export function downloadUpdatedXlsx(options: ExportXlsxOptions): void {
  if (typeof window === 'undefined') return;

  const filename = options.filename || `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const blob = generateUpdatedXlsxBlob({
    ...options,
    includeSummaryColumn: options.includeSummaryColumn ?? true,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Download an existing .xlsx buffer (e.g., from the Cloud file list on the homepage)
 * with the 'รวม' summary column automatically appended after all existing attendance columns
 * and 'Fingerprint' at Column AL (37), without adding a new blank attendance date column.
 */
export function downloadExistingXlsxWithSummary(buffer: ArrayBuffer, filename: string): void {
  if (typeof window === 'undefined') return;

  const parsed = parseSpreadsheetBuffer(buffer, 'array');
  downloadUpdatedXlsx({
    xlsxData: parsed.rawGrid,
    xlsxBase64: parsed.xlsxBase64,
    courseMeta: parsed.courseMeta,
    idColumn: parsed.selectedIdColumn,
    checkedInIds: [],
    filename: filename || 'roster_summary.xlsx',
    includeSummaryColumn: true,
    appendNewAttendanceColumn: false,
  });
}
