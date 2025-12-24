'use client';

/**
 * PassCard Component - Attndee. Pass™
 * 
 * Purpose: Bottom slide-up card for creating student pass credentials
 * Features: Smooth animations, profile form, localStorage integration
 */

import { useState } from 'react';

interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  year_level: number;
}

interface PassCardProps {
  onPassCreated: (profile: StudentProfile) => void;
  onDismiss?: () => void;
}

export default function PassCard({ onPassCreated, onDismiss }: PassCardProps) {
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [yearLevel, setYearLevel] = useState(1);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleCreatePass = () => {
    if (!studentId.trim() || !firstName.trim() || !lastName.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newProfile: StudentProfile = {
      student_id: studentId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      year_level: yearLevel,
    };

    // Save to localStorage as "attndee_pass"
    localStorage.setItem('attndee_pass', JSON.stringify(newProfile));

    // Animate out before calling callback
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
        <div className="max-w-md mx-auto px-6 py-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-black mb-2">
              Attndee<span className="text-blue-600">.</span> Pass™
            </h2>
            <p className="text-gray-600">Create your digital student pass</p>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            {/* Student ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 65130500xxx"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black font-mono"
                maxLength={20}
              />
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black"
                maxLength={50}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-black"
                maxLength={50}
              />
            </div>

            {/* Year Level with +/- controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Year Level
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
                    {yearLevel === 1 ? '1st' : yearLevel === 2 ? '2nd' : yearLevel === 3 ? '3rd' : `${yearLevel}th`} Year
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
            Create Pass
          </button>

          {/* Info */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Your pass is stored securely on this device
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
