/**
 * Client-Side Hardware & Browser Device Fingerprinting + Local Room Lock Utility
 * 
 * Purpose: Generates a deterministic device fingerprint from physical hardware
 * characteristics that remain constant across Safari, Chrome, and Incognito on the
 * same device, and manages local check-in locks and Attndee Pass™ 7-day cooldowns.
 */

const PASS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CHECKED_ROOMS_KEY = 'attndee_checked_rooms';

/**
 * Extract WebGL GPU Vendor & Renderer strings via WEBGL_debug_renderer_info
 */
function getWebGLInfo(): { vendor: string; renderer: string } {
  if (typeof document === 'undefined') {
    return { vendor: 'ssr', renderer: 'ssr' };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { vendor: 'no-webgl', renderer: 'no-webgl' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      const vendor = gl.getParameter(gl.VENDOR) || '';
      const renderer = gl.getParameter(gl.RENDERER) || '';
      return { vendor: String(vendor), renderer: String(renderer) };
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return { vendor: String(vendor), renderer: String(renderer) };
  } catch {
    return { vendor: 'error', renderer: 'error' };
  }
}

/**
 * Generate off-screen 2D canvas signature capturing font rasterization,
 * antialiasing, and GPU composite variations.
 */
function getCanvasSignature(): string {
  if (typeof document === 'undefined') {
    return 'ssr';
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-2d';

    // Antialiased text rendering
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica Neue', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Attndee Pass™ 2026! 🚀', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Attndee Pass™ 2026! 🚀', 4, 17);

    // Shapes and paths for geometric rendering variations
    ctx.beginPath();
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = '#ff3366';
    ctx.fill();

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

/**
 * FNV-1a 16-hex character hash function fallback using 32-bit bitwise math
 */
function fnv1a16Hex(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return hex1 + hex2;
}

/**
 * Hash string using SHA-256 via Web Crypto API with FNV-1a fallback
 */
async function hashSignature(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return hashHex.slice(0, 16);
    } catch {
      // Fallback if crypto.subtle fails
    }
  }
  return fnv1a16Hex(str).slice(0, 16);
}

let cachedFingerprintPromise: Promise<string> | null = null;

/**
 * Generate a deterministic 16-character hex device fingerprint.
 * Incorporates screen geometry, hardware concurrency, device memory, platform,
 * max touch points, timezone, WebGL unmasked hardware, and canvas signature.
 * Memoized in-memory during page session for sub-millisecond execution.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-device';
  }

  if (cachedFingerprintPromise) {
    return cachedFingerprintPromise;
  }

  cachedFingerprintPromise = (async () => {
    try {
      const webgl = getWebGLInfo();
      const canvas = getCanvasSignature();

      const screenWidth = window.screen?.width || 0;
      const screenHeight = window.screen?.height || 0;
      const colorDepth = window.screen?.colorDepth || 0;
      const pixelRatio = window.devicePixelRatio || 1;

      const nav = navigator as any;
      const hardwareConcurrency = nav.hardwareConcurrency || 0;
      const deviceMemory = nav.deviceMemory || 0;
      const platform = nav.platform || '';
      const maxTouchPoints = nav.maxTouchPoints || 0;

      let timeZone = '';
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      } catch {
        timeZone = '';
      }

      const payload = [
        `scr:${screenWidth}x${screenHeight}x${colorDepth}@${pixelRatio}`,
        `hw:${hardwareConcurrency}c|${deviceMemory}gb|${platform}|touch:${maxTouchPoints}`,
        `tz:${timeZone}`,
        `gl:${webgl.vendor}|${webgl.renderer}`,
        `cvs:${canvas.slice(0, 120)}`,
      ].join(';;');

      return await hashSignature(payload);
    } catch (err) {
      console.warn('Failed to compute device fingerprint:', err);
      return 'fallback-' + Math.random().toString(36).substring(2, 10);
    }
  })();

  return cachedFingerprintPromise;
}

/**
 * Calculate the 7-day cooldown status for Attndee Pass™ student profile edits.
 */
export function getPassCooldownStatus(lastUpdatedAt?: string | number): {
  canEdit: boolean;
  remainingMs: number;
  remainingText: string;
  unlockDate?: Date;
} {
  if (!lastUpdatedAt) {
    return {
      canEdit: true,
      remainingMs: 0,
      remainingText: '',
      unlockDate: undefined,
    };
  }

  const lastTime = new Date(lastUpdatedAt).getTime();
  if (isNaN(lastTime)) {
    return {
      canEdit: true,
      remainingMs: 0,
      remainingText: '',
      unlockDate: undefined,
    };
  }

  const unlockTime = lastTime + PASS_COOLDOWN_MS;
  const remainingMs = unlockTime - Date.now();

  if (remainingMs <= 0) {
    return {
      canEdit: true,
      remainingMs: 0,
      remainingText: '',
      unlockDate: new Date(unlockTime),
    };
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  let remainingText = '';
  if (days > 0) {
    remainingText = `${days}d ${hours}h remaining (อีก ${days} วัน ${hours} ชม.)`;
  } else if (hours > 0) {
    remainingText = `${hours}h ${minutes}m remaining (อีก ${hours} ชม. ${minutes} นาที)`;
  } else {
    const minsDisplay = Math.max(1, minutes);
    remainingText = `${minsDisplay}m remaining (อีก ${minsDisplay} นาที)`;
  }

  return {
    canEdit: false,
    remainingMs,
    remainingText,
    unlockDate: new Date(unlockTime),
  };
}

/**
 * Check if this physical device has already submitted a check-in for this room
 * stored in the browser's localStorage.
 */
export function isDeviceCheckedInRoom(roomId: string): {
  checkedIn: boolean;
  studentId?: string;
} {
  if (typeof window === 'undefined' || !roomId) {
    return { checkedIn: false };
  }

  try {
    const raw = localStorage.getItem(CHECKED_ROOMS_KEY);
    if (!raw) return { checkedIn: false };

    const map = JSON.parse(raw);
    const entry = map[roomId];
    if (entry && entry.studentId) {
      return {
        checkedIn: true,
        studentId: entry.studentId,
      };
    }
    return { checkedIn: false };
  } catch {
    return { checkedIn: false };
  }
}

/**
 * Record a check-in for the specified roomId and studentId in localStorage
 * to prevent immediate multi-account resubmissions on the same device.
 */
export function markDeviceCheckedInRoom(roomId: string, studentId: string): void {
  if (typeof window === 'undefined' || !roomId) return;

  try {
    const raw = localStorage.getItem(CHECKED_ROOMS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[roomId] = {
      studentId,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CHECKED_ROOMS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to mark device checked in:', err);
  }
}
