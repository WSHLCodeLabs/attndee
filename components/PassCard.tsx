'use client';

import { useState } from 'react';

export interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  year_level: number;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleCreatePass = () => {
    if (!studentId.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง');
      return;
    }

    const newProfile: StudentProfile = {
      student_id: studentId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      year_level: yearLevel,
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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
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
            <p className="text-gray-600">
              {initialProfile ? 'แก้ไขข้อมูลบัตรนิสิตดิจิทัลของคุณ' : 'สร้างบัตรนิสิตดิจิทัลประจำตัวของคุณ'}
            </p>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600 text-center mb-4">
              {errorMessage}
            </p>
          )}

          {/* Form */}
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
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-300 text-black font-bold text-xl transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreatePass}
            className="w-full py-4 bg-black text-white text-lg font-medium rounded-full hover:bg-gray-800 active:bg-gray-900 transition-all focus:outline-none focus:ring-4 focus:ring-gray-300"
          >
            {initialProfile ? 'บันทึกข้อมูลบัตร' : 'สร้างบัตรและเริ่มเช็คชื่อ'}
          </button>

          {/* Info */}
          <p className="text-xs text-gray-400 text-center mt-4">
            บัตรนิสิตจะถูกจัดเก็บไว้บนอุปกรณ์นี้อย่างปลอดภัย (สามารถแก้ไขได้ทุก 7 วัน)
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
