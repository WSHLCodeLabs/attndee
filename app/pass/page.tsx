'use client';

/**
 * Attndee Pass™ - Student Identity Management Page
 *
 * Dedicated page for students to view, create, edit, or reset their
 * digital student credentials (Attndee Pass™) directly.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PassCard, { StudentProfile } from '@/components/PassCard';
import { getPassCooldownStatus } from '@/utils/fingerprint';

export default function StudentPassPage() {
  const [profile, setProfile] = useState<StudentProfile | null | undefined>(undefined);
  const [showPassModal, setShowPassModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = () => {
      try {
        const stored = localStorage.getItem('attndee_pass');
        if (stored) {
          setProfile(JSON.parse(stored) as StudentProfile);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      }
    };

    loadProfile();
  }, []);

  const handlePassCreated = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    setShowPassModal(false);
    setNotification('บันทึกข้อมูลบัตรนิสิตเรียบร้อยแล้ว');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResetPass = () => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัตรนิสิตนี้ออกจากเครื่อง? (คุณสามารถสร้างบัตรใหม่ได้ทันที)')) {
      localStorage.removeItem('attndee_pass');
      setProfile(null);
      setNotification('ลบบัตรนิสิตออกจากเครื่องแล้ว');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const cooldown = profile ? getPassCooldownStatus(profile.last_updated_at) : null;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-100">
        <Link href="/" className="text-2xl font-bold tracking-tight text-black hover:opacity-80 transition-opacity">
          Attndee<span className="text-[#0051fc]">.</span> Pass™
        </Link>

        <Link
          href="/"
          className="text-xs font-semibold px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1.5 text-gray-700"
        >
          <span>← หน้าหลัก</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 py-10 flex flex-col items-center justify-center">
        {/* Toast Notification */}
        {notification && (
          <div className="w-full mb-6 p-4 bg-green-50 border border-green-200 text-green-800 text-sm font-medium rounded-2xl flex items-center gap-3 animate-fade-in shadow-xs">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notification}</span>
          </div>
        )}

        {/* Loading State */}
        {profile === undefined && (
          <div className="py-20 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-400">กำลังโหลดข้อมูลบัตร...</p>
          </div>
        )}

        {/* State A: Has Pass */}
        {profile && (
          <div className="w-full space-y-6">
            {/* The Digital Card Graphic */}
            <div className="w-full bg-gradient-to-br from-gray-900 via-black to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-gray-800">
              {/* Background Glow & Watermark */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-600/30 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-2 right-4 text-7xl font-black text-white/5 select-none pointer-events-none font-mono">
                PASS
              </div>

              {/* Card Header */}
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wider text-blue-400 uppercase">
                    Attndee<span className="text-white">.</span> Pass™
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                    DIGITAL ID
                  </span>
                </div>
                {/* Chip Icon */}
                <div className="w-9 h-7 rounded-md bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center">
                  <div className="w-6 h-4 border border-yellow-400/50 rounded-xs" />
                </div>
              </div>

              {/* Card Body */}
              <div className="space-y-4 mb-6 relative z-10">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
                    ชื่อ-นามสกุล / Name
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white mt-0.5">
                    {profile.first_name} {profile.last_name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
                      รหัสนิสิต / Student ID
                    </div>
                    <div className="text-lg font-mono font-bold tracking-wide text-blue-300 mt-0.5">
                      {profile.student_id}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">
                      ชั้นปี / Year Level
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      ชั้นปีที่ {profile.year_level}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 relative z-10">
                <span>บันทึกล่าสุด: {profile.last_updated_at ? new Date(profile.last_updated_at).toLocaleDateString('th-TH') : 'วันนี้'}</span>
                <span className="text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  ใช้งานได้
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPassModal(true)}
                className="w-full py-4 bg-black hover:bg-gray-800 active:scale-98 text-white font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                แก้ไขข้อมูลบัตรนิสิต
              </button>

              <button
                type="button"
                onClick={handleResetPass}
                className="w-full py-3 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-sm font-semibold rounded-2xl border border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ล้างข้อมูลบัตรเพื่อสร้างใหม่
              </button>
            </div>

            {/* Helper Notice */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
              💡 <strong>คำแนะนำ:</strong> บัตรนิสิตนี้ถูกเก็บไว้ในอุปกรณ์เครื่องนี้อย่างปลอดภัย เมื่อคุณสแกน QR Code เพื่อเช็คชื่อเข้าห้องเรียน ระบบจะใช้ข้อมูลจากบัตรนี้ในการเช็คชื่อทันทีโดยไม่ต้องกรอกซ้ำ
            </div>
          </div>
        )}

        {/* State B: No Pass Yet */}
        {profile === null && (
          <div className="w-full text-center space-y-6 py-6">
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-black tracking-tight mb-2">
                ยังไม่มีบัตรนิสิตบนเครื่องนี้
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                สร้างบัตรนิสิตดิจิทัลประจำตัวของคุณเพียงครั้งเดียว เพื่อใช้สแกนเช็คชื่อเข้าห้องเรียนได้ทันทีในทุกคาบ
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPassModal(true)}
              className="w-full py-4 bg-black hover:bg-gray-800 active:scale-98 text-white font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              สร้างบัตรนิสิตดิจิทัลของคุณ
            </button>
          </div>
        )}
      </main>

      {/* Pass Creation / Edit Modal */}
      {showPassModal && (
        <PassCard
          onPassCreated={handlePassCreated}
          onDismiss={() => setShowPassModal(false)}
          initialProfile={profile}
        />
      )}
    </div>
  );
}
