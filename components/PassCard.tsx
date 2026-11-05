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

  // Email & Password Auth State for Students (Supabase Auth)
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Check if student has already authenticated with Supabase on this device
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setVerifiedEmail(session.user.email.toLowerCase());
      }
    });
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = authEmail.trim().toLowerCase();

    if (!cleanEmail || !authPassword) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    if (!cleanEmail.endsWith('@ku.th')) {
      setErrorMessage('กรุณาใช้อีเมลสถาบัน (@ku.th) เท่านั้น');
      return;
    }

    if (authPassword.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data.user?.email) {
          setVerifiedEmail(data.user.email.toLowerCase());
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: authPassword,
        });
        if (error) throw error;

        if (data.session?.user?.email) {
          setVerifiedEmail(data.session.user.email.toLowerCase());
        } else {
          // If auto sign-in not enabled on signup, do sign in immediately
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: authPassword,
          });
          if (signInErr) throw signInErr;
          if (signInData.user?.email) {
            setVerifiedEmail(signInData.user.email.toLowerCase());
          }
        }
      }
      setAuthPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (msg.includes('already registered')) {
        setErrorMessage('อีเมลนี้ลงทะเบียนแล้ว กรุณาเลือก "เข้าสู่ระบบ"');
        setAuthMode('login');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'การยืนยันตัวตนไม่สำเร็จ');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCreatePass = () => {
    if (!verifiedEmail) {
      setErrorMessage('กรุณาเข้าสู่ระบบด้วยอีเมล @ku.th ก่อนสร้างบัตร');
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

    // Store in localStorage permanently for this device
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
              {initialProfile ? 'แก้ไขข้อมูลบัตรนิสิตดิจิทัลของคุณ' : 'สร้างบัตรนิสิตประจำตัว (ยืนยันบัญชี @ku.th)'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-5">
              <p className="text-xs sm:text-sm text-red-600 text-center font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* STEP 1: Supabase Email/Password Auth (@ku.th) */}
          <div className="mb-6">
            {!verifiedEmail ? (
              <form onSubmit={handleAuthSubmit} className="p-5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-sm font-bold text-black">
                    {authMode === 'login' ? 'เข้าสู่ระบบบัญชีนิสิต' : 'ลงทะเบียนบัญชีใหม่'}
                  </h4>
                  <div className="flex items-center text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                        setErrorMessage(null);
                      }}
                      className="text-[#0051fc] hover:underline font-semibold cursor-pointer"
                    >
                      {authMode === 'login' ? 'ยังไม่มีบัญชี? สมัคร' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="อีเมลสถาบัน เช่น name@ku.th"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-black focus:outline-none focus:border-black font-mono"
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-black focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {isAuthenticating
                    ? 'กำลังประมวลผล...'
                    : authMode === 'login'
                    ? 'เข้าสู่ระบบ'
                    : 'สมัครสมาชิก'}
                </button>
              </form>
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {verifiedEmail[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-800 font-mono font-medium truncate">
                    {verifiedEmail}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedEmail(null);
                    supabase.auth.signOut().catch(() => {});
                  }}
                  className="text-xs text-gray-400 hover:text-black underline flex-shrink-0 cursor-pointer"
                >
                  สลับบัญชี
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
