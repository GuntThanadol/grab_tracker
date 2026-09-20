'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, CheckCircle2, AlertCircle, ExternalLink, HelpCircle, Key, User, Bell } from 'lucide-react';

interface LineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string | null;
}

export default function LineSettingsModal({ isOpen, onClose, userRole }: LineSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [autoNotify, setAutoNotify] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const DEFAULT_TOKEN = 'kVSt7x6gMoIr58RUYSqd+htDr9skmUeNFjvGXUuE5ZkAZ/YoMMeDbYFADPM+rV6HHF5B5DhnYVlw7cawqWGQwo8MXvLrqFMRZI4sLVMNWftYEmEX9RccMzBTJyllP7Ewjq6BtnEIMUP/Nl3cfNHTZAdB04t89/1O/w1cDnyilFU=';
  const DEFAULT_USER_ID = 'U2110c05b07339d8342ee7d8e5cb187d2';

  useEffect(() => {
    setMounted(true);
    try {
      const savedToken = localStorage.getItem('grab_line_token') || DEFAULT_TOKEN;
      const savedUserId = localStorage.getItem('grab_line_userid') || DEFAULT_USER_ID;
      const savedAutoNotify = localStorage.getItem('grab_line_auto') !== 'false';
      setToken(savedToken);
      setUserId(savedUserId);
      setAutoNotify(savedAutoNotify);
    } catch {
      // ignore
    }
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('grab_line_token', token.trim());
      localStorage.setItem('grab_line_userid', userId.trim());
      localStorage.setItem('grab_line_auto', autoNotify ? 'true' : 'false');
      setTestResult({ success: true, msg: '✅ บันทึกการตั้งค่า LINE สำเร็จแล้ว' });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      setTestResult({ success: false, msg: `บันทึกไม่สำเร็จ: ${err.message}` });
    }
  };

  const handleTestSend = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/notify-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTest: true,
          customToken: token.trim() || undefined,
          customUserId: userId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, msg: '🎉 ข้อความทดสอบถูกส่งเข้า LINE ของคุณเรียบร้อยแล้ว!' });
      } else {
        setTestResult({ success: false, msg: `❌ ${data.error || 'ส่งไม่สำเร็จ กรุณาตรวจสอบ Token และ User ID'}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, msg: `❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>💬 ตั้งค่าการแจ้งเตือน LINE</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ส่งการ์ดสรุปรายได้ Grab เข้า LINE ส่วนตัวอัตโนมัติ (ฟรี 100%)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          
          {/* Quick Info Box */}
          <div className="rounded-xl bg-emerald-50/60 p-3 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <span>💡 ใช้ LINE Messaging API (LINE OA) ฟรีตลอดชีพ</span>
            </div>
            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
              LINE อนุญาตให้ส่งข้อความฟรี <strong>300 - 500 ข้อความ/เดือน</strong> (เราใช้วันละ 1 ครั้ง = 30 ข้อความ/เดือน ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น)
            </p>
          </div>

          {/* Channel Access Token */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Key className="h-3.5 w-3.5 text-slate-400" />
              <span>Channel Access Token (Long-lived)</span>
            </label>
            <textarea
              rows={2}
              placeholder="วาง Channel Access Token ที่ได้จาก LINE Developers Console..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition resize-none"
            />
          </div>

          {/* User ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Your User ID (ขึ้นต้นด้วย U...)</span>
            </label>
            <input
              type="text"
              placeholder="เช่น U1234567890abcdef1234567890abcdef"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Auto Notify Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoNotify}
              onChange={(e) => setAutoNotify(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              🔔 ส่งสรุปเข้า LINE อัตโนมัติทุกครั้งเมื่อกดบันทึกบัญชีรายวัน
            </span>
          </label>

          {/* Test Status Message */}
          {testResult && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.msg}</span>
            </div>
          )}

          {/* Toggle Guide Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50 transition"
            >
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-emerald-600" />
                <span>📖 วิธีสมัครและรับ Token ฟรีใน 3 นาที</span>
              </div>
              <span className="text-slate-400">{showGuide ? '▲ ซ่อน' : '▼ ดูขั้นตอน'}</span>
            </button>

            {showGuide && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                <p>1. เข้าไปที่ <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-bold inline-flex items-center gap-0.5">LINE Developers Console <ExternalLink className="h-3 w-3" /></a> แล้วล็อกอินด้วยบัญชี LINE ส่วนตัว</p>
                <p>2. กด <strong>Create a new provider</strong> (ตั้งชื่ออะไรก็ได้ เช่น <em>Grab Tracker</em>)</p>
                <p>3. กดสร้าง <strong>Create a Messaging API channel</strong> (ใส่ชื่อบอท เช่น <em>Grab Daily Bot</em> และใส่รูปโปรไฟล์ตามใจชอบ)</p>
                <p>4. สแกน <strong>QR Code</strong> ของบอทเพื่อเพิ่มเป็นเพื่อนใน LINE ของคุณ</p>
                <p>5. ไปที่แท็บ <strong>Messaging API</strong> ด้านบน:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>เลื่อนลงล่างสุดตรง <em>Channel access token</em> กดปุ่ม <strong>Issue</strong> เพื่อคัดลอก Token มาวางในช่องด้านบน</li>
                  <li>เลื่อนดูตรง <em>Your user ID</em> (ขึ้นต้นด้วยตัว U) คัดลอกมาวางในช่อง User ID ด้านบน</li>
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestSend}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isTesting ? 'กำลังส่งทดสอบ...' : '📲 ทดสอบส่งเข้า LINE'}</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 active:scale-95"
              >
                ปิด
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 active:scale-95"
              >
                💾 บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
