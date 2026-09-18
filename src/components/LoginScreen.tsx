'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Lock, User, Eye, EyeOff, LogIn, Compass, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

const ORIGINAL_PASSWORD_HASH = 'e6ede62a1283d6e95761194fb9413ffddc8ab95c5352aa6cb66270168fe9ca9a';
const PIN_HASH = '667b538e22c7d142115b8f0099ee645db4169742b44c90a54b520deadeed7359';

async function sha256(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const hash = await sha256(p);
      const isPasswordValid =
        hash === ORIGINAL_PASSWORD_HASH ||
        hash === PIN_HASH ||
        p === '120946';

      if (u === 'admin' && isPasswordValid) {
        onLogin('admin');
      } else {
        setErrorMsg('❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        triggerShake();
        setPassword('');
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  const handleGuestLogin = () => {
    onLogin('guest');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className={'w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl relative z-10 transition-transform ' + (isShake ? 'animate-bounce' : '')}
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/30 mb-4 transform hover:scale-105 transition">
            <span className="text-3xl">🏍️</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Grab บัญชีรายวัน
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            เข้าสู่ระบบเพื่อบันทึกและจัดการบัญชีของคุณ
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-400" /> ชื่อผู้ใช้
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" /> รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-slate-200 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-green-400 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ (Admin)'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">หรือ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 active:scale-[0.98] transition shadow-sm cursor-pointer"
        >
          <Compass className="h-4 w-4 text-amber-400" />
          เข้าชมในฐานะ Guest (โหมดดูอย่างเดียว)
        </button>

        <p className="text-[11px] text-center text-slate-500 mt-6 leading-relaxed">
          โหมด Guest สามารถเปิดดูสถิติ กราฟ และประวัติได้ แต่จะไม่สามารถแก้ไขหรือบันทึกข้อมูลทับได้
        </p>
      </div>
    </div>
  );
}
