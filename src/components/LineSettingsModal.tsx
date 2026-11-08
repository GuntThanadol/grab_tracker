'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Bell, CheckCircle2, Send, X } from 'lucide-react';
import { getAuthorizationHeaders } from '@/lib/auth';

interface LineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string | null;
}

export default function LineSettingsModal({ isOpen, onClose }: LineSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [autoNotify, setAutoNotify] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setAutoNotify(localStorage.getItem('grab_line_auto') !== 'false');
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    localStorage.setItem('grab_line_auto', autoNotify ? 'true' : 'false');
    setResult({ success: true, message: 'บันทึกการตั้งค่าแล้ว' });
  };

  const test = async () => {
    setIsTesting(true);
    setResult(null);
    try {
      const authorizationHeaders = await getAuthorizationHeaders();
      const response = await fetch('/api/notify-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authorizationHeaders },
        body: JSON.stringify({ isTest: true }),
      });
      const data = await response.json();
      setResult({ success: Boolean(data.success), message: data.success ? 'ส่งข้อความทดสอบเข้า LINE แล้ว' : data.error || 'ส่งข้อความไม่สำเร็จ' });
    } catch {
      setResult({ success: false, message: 'ไม่สามารถเชื่อมต่อบริการแจ้งเตือนได้' });
    } finally {
      setIsTesting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800"><h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Bell className="h-5 w-5 text-emerald-600" /> การแจ้งเตือน LINE</h3><button type="button" onClick={onClose} className="text-slate-400"><X className="h-5 w-5" /></button></div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">ข้อมูลเชื่อมต่อ LINE ถูกเก็บบนเซิร์ฟเวอร์เท่านั้น และไม่แสดงหรือบันทึกไว้ในเบราว์เซอร์</p>
        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={autoNotify} onChange={(event) => setAutoNotify(event.target.checked)} className="h-4 w-4 rounded" /> ส่งสรุปเข้า LINE เมื่อบันทึกข้อมูล</label>
        {result && <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{result.message}</div>}
        <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" disabled={isTesting} onClick={test} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><Send className="h-3.5 w-3.5 text-emerald-600" />{isTesting ? 'กำลังส่ง...' : 'ทดสอบส่ง'}</button><button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">บันทึก</button></div>
      </form>
    </div>,
    document.body,
  );
}
