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
  // Wizard Step State: 1 = Auth (@ku.th), 2 = Pass Details
  const [currentStep, setCurrentStep] = useState<1 | 2>(
    initialProfile?.email ? 2 : 1
  );

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
        const email = session.user.email.toLowerCase();
        setVerifiedEmail(email);
        // If not already explicitly started at Step 1 with no pass, advance to Step 2
        if (initialProfile) {
          setCurrentStep(2);
        }
      }
    });
  }, [initialProfile]);

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
          setCurrentStep(2);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: authPassword,
        });
        if (error) throw error;

        if (data.session?.user?.email) {
          setVerifiedEmail(data.session.user.email.toLowerCase());
          setCurrentStep(2);
        } else {
          // If auto sign-in not enabled on signup, do sign in immediately
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: authPassword,
          });
          if (signInErr) throw signInErr;
          if (signInData.user?.email) {
            setVerifiedEmail(signInData.user.email.toLowerCase());
            setCurrentStep(2);
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
      setCurrentStep(1);
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

      {/* Pass Card Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto ${
          isAnimatingOut ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          animation: isAnimatingOut ? '' : 'slideUp 300ms ease-out',
        }}
      >
        <div className="max-w-md mx-auto px-6 py-7 relative">
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
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-1">
              Attndee<span className="text-blue-600">.</span> Pass™
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">
              {currentStep === 1
                ? 'ขั้นตอนที่ 1: เข้าสู่ระบบด้วยอีเมลสถาบัน'
                : initialProfile
                ? 'ขั้นตอนที่ 2: แก้ไขข้อมูลบัตรนิสิตของคุณ'
                : 'ขั้นตอนที่ 2: กรอกข้อมูลบัตรนิสิตประจำตัว'}
            </p>
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                currentStep >= 1 ? 'bg-black' : 'bg-gray-200'
              }`}
            />
            <div
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                currentStep >= 2 ? 'bg-black' : 'bg-gray-200'
              }`}
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-5">
              <p className="text-xs sm:text-sm text-red-600 text-center font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* ================= STEP 1: AUTHENTICATION (@ku.th) ================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Segmented control: Login vs Signup */}
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-black shadow-xs font-bold'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-white text-black shadow-xs font-bold'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  ลงทะเบียนใหม่
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    อีเมลสถาบัน (@ku.th) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => {
                      setErrorMessage(null);
                      setAuthEmail(e.target.value);
                    }}
                    placeholder="เช่น student.name@ku.th"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:border-black font-mono transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => {
                      setErrorMessage(null);
                      setAuthPassword(e.target.value);
                    }}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:border-black transition-colors"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full mt-2 py-3.5 bg-black hover:bg-neutral-800 active:scale-98 text-white rounded-full text-base font-semibold transition-all disabled:opacity-60 cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>
                    {isAuthenticating
                      ? 'กำลังประมวลผล...'
                      : authMode === 'login'
                      ? 'เข้าสู่ระบบและไปต่อ'
                      : 'สมัครสมาชิกและไปต่อ'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </form>

              {/* If user already had a verified email before switching back, offer quick return */}
              {verifiedEmail && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setCurrentStep(2);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                  >
                    ใช้บัญชีเดิม ({verifiedEmail}) ต่อไปยังขั้นตอนที่ 2 →
                  </button>
                </div>
              )}

              <p className="text-[11px] text-gray-400 text-center pt-2">
                ระบบจำกัดการใช้งานเฉพาะอีเมลสถาบัน @ku.th เพื่อความถูกต้องในการเช็คชื่อ
              </p>
            </div>
          )}

          {/* ================= STEP 2: PASS DETAILS ================= */}
          {currentStep === 2 && (
            <div>
              {/* Authenticated Account Bar with Switch Option */}
              <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {verifiedEmail?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs sm:text-sm text-gray-800 font-mono font-medium truncate">
                    {verifiedEmail || 'ยังไม่ได้เข้าสู่ระบบ'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setCurrentStep(1);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex-shrink-0 cursor-pointer"
                >
                  สลับบัญชี
                </button>
              </div>

              {/* Form Inputs */}
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

              {/* Create/Save Button */}
              <button
                type="button"
                onClick={handleCreatePass}
                className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-neutral-800 active:scale-98 transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-gray-300 cursor-pointer"
              >
                {initialProfile ? 'บันทึกข้อมูลบัตร' : 'สร้างบัตรและเริ่มเช็คชื่อ'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                บัตรนิสิตจะถูกจัดเก็บไว้บนอุปกรณ์นี้อย่างปลอดภัย เพื่อความรวดเร็วในการเช็คชื่อครั้งต่อไป
              </p>
            </div>
          )}
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
