'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  year_level: number;
  email?: string;
  is_verified?: boolean;
  last_updated_at?: string;
}

export interface PassCardProps {
  onPassCreated: (profile: StudentProfile) => void;
  onDismiss?: () => void;
  initialProfile?: StudentProfile | null;
}

export default function PassCard({
  onPassCreated,
  onDismiss,
  initialProfile,
}: PassCardProps) {
  const [studentId, setStudentId] = useState(initialProfile?.student_id || '');
  const [firstName, setFirstName] = useState(initialProfile?.first_name || '');
  const [lastName, setLastName] = useState(initialProfile?.last_name || '');
  const [yearLevel, setYearLevel] = useState(initialProfile?.year_level || 1);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(
    initialProfile?.email || null
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Check if student has already authenticated with Google
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase();
        if (email.endsWith('@ku.th') || email.includes('ku.th')) {
          setVerifiedEmail(email);
          // If first/last name empty, try to pre-fill from Google metadata
          if (!firstName && session.user.user_metadata?.full_name) {
            const parts = session.user.user_metadata.full_name.trim().split(/\s+/);
            if (parts[0]) setFirstName(parts[0]);
            if (parts.length > 1) setLastName(parts.slice(1).join(' '));
          }
        }
      }
    });
  }, [firstName]);

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            hd: 'ku.th',
            prompt: 'select_account',
          },
          redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google Sign-in error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อกับ Google ได้'
      );
      setIsAuthenticating(false);
    }
  };

  // Development bypass helper for localhost testing when Google OAuth credentials aren't configured yet
  const handleDevBypassSignIn = () => {
    const demoEmail = 'student.demo@ku.th';
    setVerifiedEmail(demoEmail);
    if (!firstName) setFirstName('นิสิต');
    if (!lastName) setLastName('ทดสอบ');
    if (!studentId) setStudentId('6621650000');
  };

  const handleCreatePass = () => {
    if (!verifiedEmail) {
      setErrorMessage('กรุณาเข้าสู่ระบบด้วย Google (@ku.th) ก่อนสร้างบัตร');
      return;
    }

    if (!studentId.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง');
      return;
    }

    const newProfile: StudentProfile = {
      student_id: studentId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      year_level: yearLevel,
      email: verifiedEmail,
      is_verified: true,
      last_updated_at: new Date().toISOString(),
    };

    localStorage.setItem('attndee_pass', JSON.stringify(newProfile));

    setIsAnimatingOut(true);
    setTimeout(() => {
      onPassCreated(newProfile);
    }, 300);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      setIsAnimatingOut(true);
      setTimeout(() => {
        onDismiss();
      }, 300);
    }
  };

  const incrementYear = () => {
    setYearLevel((prev) => Math.min(prev + 1, 12));
  };

  const decrementYear = () => {
    setYearLevel((prev) => Math.max(prev - 1, 1));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isAnimatingOut ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={handleDismiss}
      />

      {/* Pass Card */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto ${
          isAnimatingOut ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          animation: isAnimatingOut ? '' : 'slideUp 300ms ease-out',
        }}
      >
        <div className="max-w-md mx-auto px-6 py-8 relative">
          {/* Close button if dismissable */}
          {onDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-500 hover:text-black flex items-center justify-center transition-all cursor-pointer"
              aria-label="ปิด"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-black mb-2">
              Attndee<span className="text-blue-600">.</span> Pass™
            </h2>
            <p className="text-gray-600 text-sm">
              {initialProfile ? 'แก้ไขข้อมูลบัตรนิสิตดิจิทัลของคุณ' : 'สร้างบัตรนิสิตดิจิทัลประจำตัวของคุณ (ยืนยันด้วยบัญชี @ku.th)'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-5">
              <p className="text-xs sm:text-sm text-red-600 text-center font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* STEP 1: Google OAuth (@ku.th) Authentication Box */}
          <div className="mb-6">
            {!verifiedEmail ? (
              <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200 mx-auto flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black">ยืนยันตัวตนด้วย Google</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    เข้าสู่ระบบด้วยบัญชีสถาบัน (@ku.th) เพื่อยืนยันสิทธิ์นิสิต
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 active:scale-98 border-2 border-gray-200 hover:border-black rounded-xl text-sm font-bold text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isAuthenticating ? 'กำลังเชื่อมต่อ Google...' : 'เข้าสู่ระบบด้วย Google (@ku.th)'}</span>
                </button>

                {/* Development bypass button (for localhost or testing without cloud credentials) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDevBypassSignIn}
                    className="text-[11px] text-gray-400 hover:text-gray-600 underline cursor-pointer"
                  >
                    จำลองเข้าสู่ระบบ @ku.th (โหมดทดสอบ)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-800 font-semibold">ยืนยันบัญชี @ku.th สำเร็จ</p>
                    <p className="text-xs text-emerald-600 font-mono truncate">{verifiedEmail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedEmail(null);
                    supabase.auth.signOut().catch(() => {});
                  }}
                  className="text-xs text-gray-500 hover:text-black underline flex-shrink-0 cursor-pointer"
                >
                  เปลี่ยน
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Pass Information Form */}
          <div className="space-y-4 mb-6">
            {/* Student ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสนิสิต <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => {
                  setErrorMessage(null);
                  setStudentId(e.target.value);
                }}
                placeholder="เช่น 6621650221"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black font-mono"
                maxLength={20}
              />
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อจริง (ไม่ต้องใส่คำนำหน้า) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setErrorMessage(null);
                  setFirstName(e.target.value);
                }}
                placeholder="เช่น กฤตินล"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black"
                maxLength={50}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setErrorMessage(null);
                  setLastName(e.target.value);
                }}
                placeholder="เช่น แสงขาว"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black"
                maxLength={50}
              />
            </div>

            {/* Year Level with +/- controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ชั้นปี
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={decrementYear}
                  disabled={yearLevel <= 1}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-5xl font-bold text-black tabular-nums">
                    {yearLevel}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ปี {yearLevel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={incrementYear}
                  disabled={yearLevel >= 12}
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            type="button"
            onClick={handleCreatePass}
            className="w-full py-4 bg-black text-white text-lg font-medium rounded-full hover:bg-gray-800 active:bg-gray-900 transition-all focus:outline-none focus:ring-4 focus:ring-gray-300 cursor-pointer"
          >
            {initialProfile ? 'บันทึกข้อมูลบัตร' : 'สร้างบัตรและเริ่มเช็คชื่อ'}
          </button>

          {/* Info */}
          <p className="text-xs text-gray-400 text-center mt-4">
            บัตรนิสิตจะถูกผูกกับอีเมล @ku.th และจัดเก็บไว้บนอุปกรณ์นี้อย่างปลอดภัย
          </p>
        </div>
      </div>

      {/* Keyframes for slide-up animation */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
