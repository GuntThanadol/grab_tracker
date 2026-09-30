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
  const [isExiting, setIsExiting] = useState(false);

  const proceedLogin = (role: UserRole) => {
    setIsExiting(true);
    setTimeout(() => {
      onLogin(role);
    }, 350);
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
    proceedLogin('guest');
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 bg-[#080d14] relative overflow-hidden transition-all duration-350 ease-out ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Dynamics: Speed Grid, Carbon Weave & Dual Headlight Glow */}
      <div className="absolute inset-0 bg-carbon-mesh opacity-25 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-speed-glow pointer-events-none" />

      {/* Cockpit Ignition Card */}
      <div
        className={'w-full max-w-md bg-[#0d131f]/90 backdrop-blur-2xl border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative z-10 transition-transform cockpit-card ring-1 ring-emerald-500/20 ' + (isShake ? 'animate-bounce' : '')}
      >
        <div className="text-center mb-7">
          {/* Animated Motorcycle Ignition Ring */}
          <div className="relative inline-flex items-center justify-center mb-4 group cursor-pointer">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-emerald-400/50 shadow-xl">
              <span className="text-3xl transform transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12 inline-block">🏍️</span>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-lime-400 led-beacon-green" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 led-beacon-green"></span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold">
              KEYLESS IGNITION SYSTEM
            </span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            Grab บัญชีรายวัน
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            COCKPIT TELEMETRY & DRIVER TRACKER
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs font-semibold text-rose-300 animate-fade-in shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-400" /> ชื่อผู้ใช้ (Username)
              </span>
              <span className="text-[10px] font-mono text-emerald-500/80">PILOT ID</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" /> รหัสผ่าน (Password / PIN)
              </span>
              <span className="text-[10px] font-mono text-emerald-500/80">SECURITY PIN</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน หรือ PIN"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition shadow-inner font-mono tracking-wider"
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

          {/* Start Engine / Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 px-4 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border-t border-white/25 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
            <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span className="tracking-wide">
              {isLoading ? 'กำลังสตาร์ทระบบ...' : 'START ENGINE • เข้าสู่ระบบ (Admin)'}
            </span>
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0d131f] px-3 text-slate-500 font-mono text-[10px] tracking-widest">OR CRUISE ACCESS</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/40 px-4 py-3.5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white hover:border-emerald-500/40 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
        >
          <Compass className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="font-mono">CRUISE MODE • Guest Mode</span>
        </button>
      </div>
    </div>
  );
}
