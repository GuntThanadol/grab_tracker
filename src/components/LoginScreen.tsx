'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Lock, User, Eye, EyeOff, ArrowRight, Compass, ShieldAlert, Bike } from 'lucide-react';

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
  const [isExiting, setIsExiting] = useState(false);

  const proceedLogin = (role: UserRole) => {
    setIsExiting(true);
    setTimeout(() => {
      onLogin(role);
    }, 300);
  };

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
        proceedLogin('admin');
      } else {
        setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
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
    proceedLogin('guest');
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-slate-950 text-slate-100 bg-grid-pattern relative selection:bg-emerald-500 selection:text-white transition-opacity duration-300 ${
        isExiting ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top status bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono text-emerald-400 text-[11px] font-medium tracking-tight">RIDER TELEMETRY ENGINE</span>
        </div>
        <div className="text-slate-500 font-mono text-[11px] hidden sm:block">
          BUILD V2.4 • LATENCY OPTIMIZED
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div
          className={`border border-slate-800 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl relative transition-transform ${
            isShake ? 'animate-bounce' : ''
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <Bike className="w-4 h-4" />
                <span>Grab Driver Tracker</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                ระบบบัญชีรายวัน
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                บันทึกรายได้ คำนวณค่าน้ำมันอัตโนมัติ และสถิติเชิงลึก
              </p>
            </div>
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
              ฿
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ชื่อผู้ใช้งาน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                รหัสผ่านความปลอดภัย
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านเข้าใช้งาน"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-glow-emerald"
            >
              <span>{isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบบัญชี'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500">หรือสำหรับผู้เยี่ยมชม</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-amber-400" />
              <span>เปิดโหมดผู้สังเกตการณ์ (Guest Mode)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Read Only</span>
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="w-full max-w-5xl mx-auto py-2 text-center text-[11px] text-slate-500">
        ออกแบบเพื่อความสะดวกและรวดเร็วสำหรับคนขับ Grab บนท้องถนนทุกวัน
      </div>
    </div>
  );
}
