'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Compass, Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setIsLoading(false);
    if (error) {
      setPassword('');
      setErrorMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return;
    }
    onLogin();
  };

  const handleGuestLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setIsLoading(false);
    if (error) {
      setErrorMsg('ไม่สามารถเข้า Guest Mode ได้ กรุณาเปิด Anonymous Sign-Ins ใน Supabase');
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-3xl text-white">🏍️</div>
          <h1 className="text-2xl font-black tracking-tight text-white">Grab Smart Tracker</h1>
          <p className="mt-1.5 text-sm text-slate-400">เข้าสู่ระบบเพื่อบันทึกและจัดการบัญชีของคุณ</p>
        </div>
        {errorMsg && <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-xs font-semibold text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}</div>}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <label className="block text-xs font-bold text-slate-300"><span className="mb-1.5 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-emerald-400" /> Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" /></label>
          <label className="block text-xs font-bold text-slate-300"><span className="mb-1.5 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> Password</span><span className="relative block"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 pr-11 text-sm text-white focus:border-emerald-500 focus:outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50"><LogIn className="h-4 w-4" />{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</button>
        </form>
        <div className="my-6 border-t border-slate-800" />
        <button type="button" disabled={isLoading} onClick={handleGuestLogin} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3.5 text-sm font-bold text-slate-200 disabled:opacity-50"><Compass className="h-4 w-4 text-amber-400" /> Guest</button>
      </div>
    </div>
  );
}
