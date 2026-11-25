'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Bell,
  CalendarRange,
  Check,
  CheckCircle2,
  Copy,
  LayoutGrid,
  Send,
  Target,
  Wrench,
  X,
} from 'lucide-react';
import { getAuthorizationHeaders } from '@/lib/auth';
import { odometerValue } from '@/lib/utils';
import { BotSettings, Entry } from '@/types';

interface LineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string | null;
  entries?: Entry[];
}

interface EnvStatus {
  hasAccessToken: boolean;
  hasUserId: boolean;
  hasChannelSecret: boolean;
  hasServiceRoleKey: boolean;
  hasCronSecret: boolean;
}

const DEFAULT_SETTINGS: BotSettings = {
  daily_goal: 400,
  weekly_trips_goal: 45,
  monthly_goal: 8000,
  engine_oil_interval_km: 2500,
  last_engine_oil_odo: 0,
  gear_oil_interval_km: 5000,
  last_gear_oil_odo: 0,
  tax_expire_date: null,
};

type ModalTab = 'connection' | 'goals' | 'maintenance';

/**
 * Draws a crisp 1200x810 6-tile Thai Rich Menu PNG on an offscreen canvas.
 */
async function generateRichMenuPngBlob(): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 810;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1200, 810);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 810);

  const tiles = [
    { col: 0, row: 0, icon: '📊', title: 'สรุปวันนี้', sub: 'ดูยอด & กำไร', accent: '#10b981' },
    { col: 1, row: 0, icon: '📅', title: 'สัปดาห์นี้', sub: 'เช็คเป้างาน', accent: '#38bdf8' },
    { col: 2, row: 0, icon: '🗓️', title: 'เดือนนี้', sub: 'ภาพรวมรายเดือน', accent: '#818cf8' },
    { col: 0, row: 1, icon: '✍️', title: 'วิธีพิมพ์บันทึก', sub: 'คำสั่งลัดทั้งหมด', accent: '#f59e0b' },
    { col: 1, row: 1, icon: '🔧', title: 'เช็คระยะ & น้ำมัน', sub: 'ไมล์รถ & ภาษี', accent: '#14b8a6' },
    { col: 2, row: 1, icon: '🌐', title: 'เปิดเว็บ Tracker', sub: 'ดูกราฟ & ประวัติ', accent: '#22c55e' },
  ];

  const pad = 18;
  const cellW = 400;
  const cellH = 405;

  for (const tile of tiles) {
    const x = tile.col * cellW + pad;
    const y = tile.row * cellH + pad;
    const w = cellW - pad * 2;
    const h = cellH - pad * 2;

    // Card background
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();
    ctx.stroke();

    // Accent top bar
    ctx.fillStyle = tile.accent;
    ctx.beginPath();
    ctx.roundRect(x + 28, y + 24, 68, 8, 4);
    ctx.fill();

    // Emoji icon
    ctx.font = '76px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.icon, x + w / 2, y + h * 0.39);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 34px "Noto Sans Thai", "Segoe UI", sans-serif';
    ctx.fillText(tile.title, x + w / 2, y + h * 0.66);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px "Noto Sans Thai", "Segoe UI", sans-serif';
    ctx.fillText(tile.sub, x + w / 2, y + h * 0.81);
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export default function LineSettingsModal({ isOpen, onClose, entries = [] }: LineSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('connection');
  const [autoNotify, setAutoNotify] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('grab_line_auto') !== 'false';
    } catch {
      return true;
    }
  });
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [botSettings, setBotSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
  const [tableExists, setTableExists] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const latestOdo = useMemo(() => {
    for (const r of entries) {
      const o = odometerValue(r);
      if (o !== null && o > 0) return o;
    }
    return null;
  }, [entries]);

  const webhookUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/line-webhook';
    return `${window.location.origin}/api/line-webhook`;
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setResult(null);

    const loadStatusAndSettings = async () => {
      try {
        const headers = await getAuthorizationHeaders();
        const [statusRes, settingsRes] = await Promise.all([
          fetch('/api/notify-line', { headers }),
          fetch('/api/bot-settings', { headers }),
        ]);

        if (!active) return;
        if (statusRes.ok) {
          const st = await statusRes.json();
          setEnvStatus({
            hasAccessToken: Boolean(st.hasAccessToken),
            hasUserId: Boolean(st.hasUserId),
            hasChannelSecret: Boolean(st.hasChannelSecret),
            hasServiceRoleKey: Boolean(st.hasServiceRoleKey),
            hasCronSecret: Boolean(st.hasCronSecret),
          });
        }
        if (settingsRes.ok) {
          const bs = await settingsRes.json();
          setTableExists(Boolean(bs.tableExists));
          if (bs.settings) {
            setBotSettings({
              ...DEFAULT_SETTINGS,
              ...bs.settings,
            });
          }
        }
      } catch {
        // ignore load errors
      }
    };

    void loadStatusAndSettings();
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const saveLocalAutoNotify = (checked: boolean) => {
    setAutoNotify(checked);
    try {
      localStorage.setItem('grab_line_auto', checked ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      setResult({ success: false, message: 'ไม่สามารถคัดลอกลิงก์ได้' });
    }
  };

  const triggerLineSend = async (
    actionKey: string,
    payload: { isTest?: boolean; reportType?: 'weekly' | 'monthly' | 'maintenance' }
  ) => {
    setBusyAction(actionKey);
    setResult(null);
    try {
      const authorizationHeaders = await getAuthorizationHeaders();
      const response = await fetch('/api/notify-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authorizationHeaders },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setResult({
        success: Boolean(data.success),
        message: data.success ? data.message || 'ส่งเข้า LINE เรียบร้อยแล้ว' : data.error || 'ส่งข้อความไม่สำเร็จ',
      });
    } catch {
      setResult({ success: false, message: 'ไม่สามารถเชื่อมต่อบริการแจ้งเตือนได้' });
    } finally {
      setBusyAction(null);
    }
  };

  const installRichMenu = async () => {
    setBusyAction('richmenu');
    setResult(null);
    try {
      const blob = await generateRichMenuPngBlob();
      if (!blob) {
        setResult({ success: false, message: 'สร้างภาพ Rich Menu ไม่สำเร็จ' });
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'richmenu.png');
      formData.append('appUrl', `${window.location.origin}/`);

      const authorizationHeaders = await getAuthorizationHeaders();
      const res = await fetch('/api/line-richmenu', {
        method: 'POST',
        headers: { ...authorizationHeaders },
        body: formData,
      });
      const data = await res.json();
      setResult({
        success: Boolean(data.success),
        message: data.success ? data.message : data.error || 'ติดตั้ง Rich Menu ไม่สำเร็จ',
      });
    } catch {
      setResult({ success: false, message: 'เกิดข้อผิดพลาดระหว่างอัปโหลด Rich Menu' });
    } finally {
      setBusyAction(null);
    }
  };

  const saveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('save_bot');
    setResult(null);
    try {
      const authorizationHeaders = await getAuthorizationHeaders();
      const res = await fetch('/api/bot-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authorizationHeaders },
        body: JSON.stringify(botSettings),
      });
      const data = await res.json();
      setTableExists(Boolean(data.tableExists));
      if (data.settings) setBotSettings(data.settings);
      setResult({
        success: Boolean(data.success),
        message: data.success ? 'บันทึกการตั้งค่าเป้าหมายและเช็คระยะเรียบร้อยแล้ว' : data.error || 'บันทึกไม่สำเร็จ',
      });
    } catch {
      setResult({ success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setBusyAction(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Bell className="h-5 w-5 text-emerald-600" /> ตั้งค่า LINE Chatbot
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/60">
          {[
            { id: 'connection' as const, label: 'เชื่อมต่อ & เมนู', icon: LayoutGrid },
            { id: 'goals' as const, label: 'เป้าหมาย', icon: Target },
            { id: 'maintenance' as const, label: 'เช็คระยะรถ', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setResult(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!tableExists && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              ⚠️ ยังไม่ได้สร้างตาราง <code>bot_settings</code> ใน Supabase — กรุณารันไฟล์ SQL{' '}
              <code>supabase/migrations/20261125_line_bot_goals_maintenance.sql</code> เพื่อบันทึกเป้าหมายและระยะบำรุงรักษา
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-4">
              {/* Server Env Checklist */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  สถานะคีย์บนเซิร์ฟเวอร์ (.env / Vercel)
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    { key: 'hasAccessToken', label: 'Access Token' },
                    { key: 'hasUserId', label: 'LINE User ID' },
                    { key: 'hasChannelSecret', label: 'Channel Secret' },
                    { key: 'hasServiceRoleKey', label: 'Service Role Key' },
                  ].map((item) => {
                    const ok = envStatus ? envStatus[item.key as keyof EnvStatus] : false;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ${
                          ok
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Webhook URL Copy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Webhook URL (นำไปวางใน LINE Developers Console)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={copyWebhook}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWebhook ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                </div>
              </div>

              {/* Auto Notify Toggle */}
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={autoNotify}
                  onChange={(e) => saveLocalAutoNotify(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600"
                />
                ส่งสรุปเข้า LINE อัตโนมัติเมื่อบันทึกข้อมูลบนหน้าเว็บ
              </label>

              {/* Quick Actions */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">คำสั่งด่วนและ Rich Menu</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => triggerLineSend('test', { isTest: true })}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600" />
                    {busyAction === 'test' ? 'กำลังส่ง...' : 'ทดสอบการ์ดรายวัน'}
                  </button>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => triggerLineSend('weekly', { reportType: 'weekly' })}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <CalendarRange className="h-3.5 w-3.5 text-sky-600" />
                    {busyAction === 'weekly' ? 'กำลังส่ง...' : 'ส่งสรุปสัปดาห์นี้'}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={installRichMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <LayoutGrid className="h-4 w-4" />
                  {busyAction === 'richmenu' ? 'กำลังสร้างและอัปโหลดเมนู...' : 'สร้างและติดตั้ง Rich Menu ในแชท LINE อัตโนมัติ'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <form onSubmit={saveBotSettings} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                บอทจะคำนวณหลอดความคืบหน้า % แสดงในการ์ดสรุปทุกวัน และเตือนเมื่อทำยอดครบเป้า
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ☀️ เป้ากำไรสุทธิต่อวัน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={botSettings.daily_goal}
                    onChange={(e) => setBotSettings((s) => ({ ...s, daily_goal: Number(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    📦 เป้าจำนวนงานต่อสัปดาห์ (สำหรับอินเซนทีฟ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={botSettings.weekly_trips_goal}
                    onChange={(e) => setBotSettings((s) => ({ ...s, weekly_trips_goal: Number(e.target.value) || 1 }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🗓️ เป้ากำไรสุทธิต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={botSettings.monthly_goal}
                    onChange={(e) => setBotSettings((s) => ({ ...s, monthly_goal: Number(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busyAction !== null}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busyAction === 'save_bot' ? 'กำลังบันทึก...' : '💾 บันทึกเป้าหมาย'}
              </button>
            </form>
          )}

          {activeTab === 'maintenance' && (
            <form onSubmit={saveBotSettings} className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
                <span className="text-slate-600 dark:text-slate-300">
                  เลขไมล์ล่าสุดในระบบ:{' '}
                  <strong>{latestOdo ? `${latestOdo.toLocaleString('th-TH')} กม.` : 'ยังไม่มีข้อมูล'}</strong>
                </span>
                {latestOdo && (
                  <button
                    type="button"
                    onClick={() => setBotSettings((s) => ({ ...s, last_engine_oil_odo: latestOdo }))}
                    className="font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    ใช้ตั้งค่าน้ำมันเครื่อง
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    🛢️ รอบน้ำมันเครื่อง (กม.)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={botSettings.engine_oil_interval_km}
                    onChange={(e) =>
                      setBotSettings((s) => ({ ...s, engine_oil_interval_km: Number(e.target.value) || 2500 }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ไมล์ที่เปลี่ยนล่าสุด
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={botSettings.last_engine_oil_odo}
                    onChange={(e) =>
                      setBotSettings((s) => ({ ...s, last_engine_oil_odo: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ⚙️ รอบเฟืองท้าย/โซ่ (กม.)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={botSettings.gear_oil_interval_km}
                    onChange={(e) =>
                      setBotSettings((s) => ({ ...s, gear_oil_interval_km: Number(e.target.value) || 5000 }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ไมล์ที่เปลี่ยนล่าสุด
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={botSettings.last_gear_oil_odo}
                    onChange={(e) =>
                      setBotSettings((s) => ({ ...s, last_gear_oil_odo: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  📄 วันหมดอายุ พ.ร.บ. / ภาษีรถ
                </label>
                <input
                  type="date"
                  value={botSettings.tax_expire_date || ''}
                  onChange={(e) =>
                    setBotSettings((s) => ({ ...s, tax_expire_date: e.target.value || null }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => triggerLineSend('maint', { reportType: 'maintenance' })}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busyAction === 'maint' ? 'กำลังส่ง...' : '🔧 ส่งการ์ดเช็คระยะ'}
                </button>
                <button
                  type="submit"
                  disabled={busyAction !== null}
                  className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busyAction === 'save_bot' ? 'กำลังบันทึก...' : '💾 บันทึกการเช็คระยะ'}
                </button>
              </div>
            </form>
          )}

          {result && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                result.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="leading-relaxed">{result.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
