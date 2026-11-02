'use client';

/**
 * TeacherAuthModal — Minimalist Popup Login & Register for Instructors
 *
 * Features:
 * - Basic Email + Password authentication via Supabase Auth (zero password-reset bloat).
 * - Clear explanation of the KU Excel Cross-Device Cloud Backup mechanism right inside the popup.
 * - Instant login upon registration (works alongside our Postgres auto-confirm trigger).
 */

import { useState } from 'react';
import { X, Cloud, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/utils/supabase';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TeacherAuthModal({
  isOpen,
  onClose,
  onSuccess,
}: TeacherAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const translateAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
    }
    if (lower.includes('user already registered') || lower.includes('already been registered')) {
      return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาสลับไปหน้า "เข้าสู่ระบบ"';
    }
    if (lower.includes('password should be at least')) {
      return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
    }
    if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
      return 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        // If session wasn't returned immediately, sign in directly (auto-confirmed by DB trigger)
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInErr) throw signInErr;
        }
      }

      setEmail('');
      setPassword('');
      onSuccess();
      onClose();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      setErrorMsg(translateAuthError(raw));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0051fc] flex items-center justify-center flex-shrink-0">
            <Cloud size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black tracking-tight leading-tight">
              Attndee<span className="text-[#0051fc]">.</span> Cloud™
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              สำหรับอาจารย์ผู้สอน (Instructor Cloud Backup)
            </p>
          </div>
        </div>

        {/* Cloud Backup Mechanism Explanation Box */}
        <div className="mt-4 mb-6 p-4 rounded-2xl bg-[#f4fbf7] border border-[#2bb673]/40 text-xs sm:text-sm text-gray-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#1f9d5c]">
            <FileSpreadsheet size={16} className="flex-shrink-0" />
            <span>ระบบสำรองไฟล์ Excel KU ข้ามเครื่องโดยเฉพาะ</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            เก็บและซิงค์ไฟล์รายชื่อนิสิต (<strong>.xlsx</strong>) ผูกกับบัญชีอาจารย์บน Cloud อย่างปลอดภัย เมื่อเช็คชื่อเสร็จและกด <strong>&ldquo;ออกห้อง&rdquo;</strong> ระบบจะบันทึกคะแนนทับไฟล์เดิมบน Cloud ให้อัตโนมัติ เปิดสอนต่อจากคอมพิวเตอร์เครื่องไหนก็ได้ทันทีโดยไม่ต้องพกไฟล์
          </p>
        </div>

        {/* Mode Switcher Tabs (Login / Register) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black shadow-2xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black shadow-2xs'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            สมัครสมาชิกอาจารย์
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              อีเมลอาจารย์ (Email)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@ku.th"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm sm:text-base text-black focus:outline-none focus:border-black transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              รหัสผ่าน (Password อย่างน้อย 6 ตัวอักษร)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm sm:text-base text-black focus:outline-none focus:border-black transition-colors"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#0051fc] hover:bg-blue-700 active:scale-[0.99] text-white text-sm sm:text-base font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading
              ? 'กำลังดำเนินการ...'
              : mode === 'login'
              ? 'เข้าสู่ระบบ Cloud'
              : 'สมัครสมาชิกและเริ่มใช้งานทันที'}
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck size={14} className="text-[#2bb673]" />
          <span>ไฟล์ถูกปกป้องด้วย Supabase Storage RLS เฉพาะบัญชีของคุณเท่านั้น</span>
        </div>
      </div>
    </div>
  );
}
