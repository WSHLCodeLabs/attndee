'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
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
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    }
    if (lower.includes('user already registered') || lower.includes('already been registered')) {
      return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
    }
    if (lower.includes('password should be at least')) {
      return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
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
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน');
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
      const raw = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setErrorMsg(translateAuthError(raw));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40"
    >
      <div
        className="bg-white rounded-2xl max-w-[400px] w-full p-7 sm:p-8 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors cursor-pointer"
          aria-label="ปิด"
        >
          <X size={20} />
        </button>

        {/* Title & Subtitle */}
        <h2 className="text-2xl font-bold text-black tracking-tight">
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
        </h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          เก็บไฟล์รายชื่อนิสิตไว้เปิดใช้ข้ามเครื่อง และบันทึกคะแนนต่อจากไฟล์เดิมให้อัตโนมัติทุกครั้งที่จบคลาส
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="อีเมล"
            className="w-full px-4 py-3.5 border border-neutral-800 rounded-xl text-base text-black placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition-all"
            autoComplete="email"
          />

          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
            className="w-full px-4 py-3.5 border border-neutral-800 rounded-xl text-base text-black placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black transition-all"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {errorMsg && (
            <p className="text-xs text-red-600 font-medium px-0.5">
              {errorMsg}
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#0051fc] hover:bg-blue-700 active:scale-[0.99] text-white text-base font-bold rounded-full transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading
                ? 'กำลังดำเนินการ...'
                : mode === 'login'
                ? 'เข้าสู่ระบบ'
                : 'สมัครใช้งาน'}
            </button>
          </div>
        </form>

        {/* Simple Text Toggle */}
        <div className="mt-5 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              ยังไม่มีบัญชี?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className="font-bold text-black hover:underline cursor-pointer"
              >
                สมัครใช้งาน
              </button>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="font-bold text-black hover:underline cursor-pointer"
              >
                เข้าสู่ระบบ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
