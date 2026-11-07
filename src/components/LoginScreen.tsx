'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/types';
import { Lock, User, Eye, EyeOff, ShieldAlert, Sparkles, Compass } from 'lucide-react';

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
  const [isShake, setIsShake] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animation states for the login button
  // 'idle' | 'driving' | 'success'
  const [animState, setAnimState] = useState<'idle' | 'driving' | 'success'>('idle');
  const [speedVal, setSpeedVal] = useState(0);

  // Speedometer counter effect during driving
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (animState === 'driving') {
      setSpeedVal(10);
      interval = setInterval(() => {
        setSpeedVal((prev) => {
          if (prev >= 120) {
            clearInterval(interval);
            return 120;
          }
          return prev + Math.floor(Math.random() * 25) + 15;
        });
      }, 70);
    } else {
      setSpeedVal(0);
    }
    return () => clearInterval(interval);
  }, [animState]);

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (animState !== 'idle') return;
    setErrorMsg('');

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      triggerShake();
      return;
    }

    // Step 1: Trigger motor drive / speedometer animation
    setAnimState('driving');

    try {
      const hash = await sha256(p);
      const isPasswordValid =
        hash === ORIGINAL_PASSWORD_HASH ||
        hash === PIN_HASH ||
        p === '120946';

      // Give 900ms for user to experience the motorcycle launch and speedometer max out
      setTimeout(() => {
        if (u === 'admin' && isPasswordValid) {
          setAnimState('success');
          setIsExiting(true);
          setTimeout(() => {
            onLogin('admin');
          }, 400);
        } else {
          setAnimState('idle');
          setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
          triggerShake();
          setPassword('');
        }
      }, 900);
    } catch {
      setAnimState('idle');
      setErrorMsg('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
  };

  const handleGuestLogin = () => {
    if (animState !== 'idle') return;
    setAnimState('driving');
    setTimeout(() => {
      setAnimState('success');
      setIsExiting(true);
      setTimeout(() => {
        onLogin('guest');
      }, 300);
    }, 600);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-all duration-300 ease-out ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Soft Glows */}
      <div className="absolute -top-36 -left-36 w-96 h-96 bg-[#00B14F]/15 dark:bg-[#00B14F]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-96 h-96 bg-emerald-400/15 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div
        className={`w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-7 sm:p-9 shadow-xl relative z-10 transition-transform ${
          isShake ? 'animate-bounce' : ''
        }`}
      >
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00B14F] text-white shadow-lg shadow-[#00B14F]/30 mb-3.5 transform hover:scale-105 transition-transform duration-200">
            {/* Grab Delivery Motorcycle Icon */}
            <svg
              className="w-9 h-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M15 6h-3l-2 5h7l-2-5z" />
              <path d="M9 17l2.5-6.5h4L18 17" />
              <path d="M6 10h4" />
              <circle cx="12" cy="5" r="1" />
            </svg>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#00B14F] uppercase tracking-wider mb-1">
            <span>Grab Driver Tracker</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            เข้าสู่ระบบบัญชีรายวัน
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บันทึกรายได้ คำนวณค่าน้ำมันอัตโนมัติ และสถิติรอบขับ
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#00B14F]" /> ชื่อผู้ใช้
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              disabled={animState !== 'idle'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#00B14F] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/20 transition disabled:opacity-60"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#00B14F]" /> รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                disabled={animState !== 'idle'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#00B14F] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00B14F]/20 transition disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Interactive Motorcycle Launch / Speedometer Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={animState !== 'idle'}
              className="relative w-full h-13 overflow-hidden rounded-2xl bg-[#00B14F] hover:bg-[#009643] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-[#00B14F]/25 hover:shadow-[#00B14F]/40 transition-all duration-200 cursor-pointer disabled:cursor-default"
            >
              {/* Normal Idle State */}
              {animState === 'idle' && (
                <div className="flex items-center justify-center gap-2 h-full">
                  <span>เข้าสู่ระบบ (Login)</span>
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              )}

              {/* Driving / Accelerating Animation State */}
              {animState === 'driving' && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#009643] via-[#00B14F] to-[#054e25] flex items-center justify-between px-4">
                  {/* Road Track with Moving Stripes */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                    <div className="w-full h-full flex items-center">
                      <div className="w-full border-b-2 border-dashed border-white animate-pulse" />
                    </div>
                  </div>

                  {/* Speedometer Gauge HUD */}
                  <div className="relative z-10 flex items-center gap-1.5 font-mono text-xs font-extrabold text-white bg-black/25 px-2.5 py-1 rounded-lg border border-white/20">
                    <svg
                      className="w-3.5 h-3.5 text-emerald-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2a10 10 0 0 0-10 10c0 3.1 1.4 5.9 3.6 7.8" />
                      <path d="M22 12a10 10 0 0 0-3.6-7.8" />
                      <path
                        d="M12 12l4-4"
                        style={{
                          transformOrigin: '12px 12px',
                          transform: `rotate(${Math.min(speedVal * 2, 180)}deg)`,
                          transition: 'transform 0.1s linear',
                        }}
                      />
                    </svg>
                    <span>{speedVal} KM/H</span>
                  </div>

                  {/* Delivery Motorcycle Driving Forward across Button */}
                  <div
                    className="relative z-10 flex items-center"
                    style={{
                      animation: 'driveForward 0.85s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                    }}
                  >
                    <div className="relative">
                      {/* Exhaust Speed Trail */}
                      <span className="absolute -left-5 top-2 text-[10px] text-emerald-200 opacity-75 font-mono">
                        💨💨
                      </span>
                      {/* Motorcycle */}
                      <span className="text-2xl drop-shadow-md">🛵</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Arrival State */}
              {animState === 'success' && (
                <div className="absolute inset-0 bg-[#008b3d] flex items-center justify-center gap-2 text-white font-bold animate-fade-in">
                  <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
                  <span>ออกตัวสำเร็จ! กำลังเข้าสู่ระบบ...</span>
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">หรือ</span>
          </div>
        </div>

        {/* Guest Mode Button */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={animState !== 'idle'}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
        >
          <Compass className="h-4 w-4 text-[#00B14F]" />
          <span>เข้าชมในโหมดผู้สังเกตการณ์ (Guest Mode)</span>
        </button>
      </div>

      <style jsx>{`
        @keyframes driveForward {
          0% {
            transform: translateX(-40px);
            opacity: 0.2;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateX(180px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
