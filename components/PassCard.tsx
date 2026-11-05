'use client';

import { useState } from 'react';

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
  const [email, setEmail] = useState(initialProfile?.email || '');
  const [firstName, setFirstName] = useState(initialProfile?.first_name || '');
  const [lastName, setLastName] = useState(initialProfile?.last_name || '');
  const [yearLevel, setYearLevel] = useState(initialProfile?.year_level || 1);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Auto-suggest b{student_id}@ku.th when typing studentId if email has not been manually customized
  const handleStudentIdChange = (val: string) => {
    setErrorMessage(null);
    setStudentId(val);

    // If email is empty or matches an auto-generated b... pattern, update it seamlessly
    if (!email || (email.startsWith('b') && email.endsWith('@ku.th'))) {
      const cleanDigits = val.replace(/\D/g, '');
      if (cleanDigits.length >= 8) {
        setEmail(`b${cleanDigits}@ku.th`);
      }
    }
  };

  const handleCreatePass = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanId || !cleanEmail || !cleanFirstName || !cleanLastName) {
      setErrorMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    // Require email to end with @ku.th (or official KU domain variants like .ku.th / @ku.ac.th)
    const isAllowedDomain =
      cleanEmail.endsWith('@ku.th') ||
      cleanEmail.endsWith('.ku.th') ||
      cleanEmail.endsWith('@ku.ac.th');

    if (!isAllowedDomain) {
      setErrorMessage('กรุณาใช้อีเมลสถาบันที่ลงท้ายด้วย @ku.th เท่านั้น');
      return;
    }

    const newProfile: StudentProfile = {
      student_id: cleanId,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      year_level: yearLevel,
      email: cleanEmail,
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
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-black mb-1.5">
              Attndee<span className="text-blue-600">.</span> Pass™
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">
              {initialProfile
                ? 'แก้ไขข้อมูลบัตรนิสิตประจำตัว'
                : 'สร้างบัตรนิสิตประจำตัว (ยืนยันอีเมล @ku.th)'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-5">
              <p className="text-xs sm:text-sm text-red-600 text-center font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleCreatePass} className="space-y-4">
            {/* Student ID */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                รหัสนิสิต <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => handleStudentIdChange(e.target.value)}
                placeholder="เช่น 6621650221"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black font-mono text-sm sm:text-base"
                maxLength={20}
                required
              />
            </div>

            {/* KU Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  อีเมลสถาบัน (@ku.th) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">ลงท้ายด้วย @ku.th</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setErrorMessage(null);
                  setEmail(e.target.value);
                }}
                placeholder="เช่น name.s@ku.th หรือ b6621650221@ku.th"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black font-mono text-sm sm:text-base"
                required
              />
            </div>

            {/* First Name & Last Name in 2 columns on mobile/tablet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  ชื่อจริง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setFirstName(e.target.value);
                  }}
                  placeholder="เช่น กฤตินล"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black text-sm sm:text-base"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
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
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black text-sm sm:text-base"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            {/* Year Level with +/- controls */}
            <div className="pt-1">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2.5 text-center">
                ชั้นปี
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={decrementYear}
                  disabled={yearLevel <= 1}
                  className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-lg transition-all focus:outline-none cursor-pointer"
                >
                  −
                </button>
                <div className="text-center w-20">
                  <div className="text-4xl font-bold text-black tabular-nums">
                    {yearLevel}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    ปี {yearLevel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={incrementYear}
                  disabled={yearLevel >= 12}
                  className="w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-lg transition-all focus:outline-none cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 bg-black text-white text-base font-semibold rounded-full hover:bg-neutral-800 active:scale-98 transition-all shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
              >
                {initialProfile ? 'บันทึกข้อมูลบัตร' : 'สร้างบัตรและเริ่มเช็คชื่อ'}
              </button>
            </div>
          </form>

          {/* Info note */}
          <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
            บัตรนิสิตจะถูกจัดเก็บไว้บนอุปกรณ์นี้อย่างปลอดภัย เพื่อความรวดเร็วในการเช็คชื่อครั้งต่อไป
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
