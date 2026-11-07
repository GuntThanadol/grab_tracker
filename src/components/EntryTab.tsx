'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, getTodayThai, fmtDateSlash } from '@/lib/utils';
import { FuelSettings } from '@/types';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Fuel, 
  Bike, 
  Wallet, 
  ArrowDownLeft, 
  Clock, 
  FileText, 
  Calculator,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react';
import ThaiDatePicker from './ThaiDatePicker';

interface EntryTabProps {
  fuelSettings: FuelSettings;
  onSuccess: () => void;
}

export default function EntryTab({ fuelSettings, onSuccess }: EntryTabProps) {
  const today = getTodayThai();
  const [date, setDate] = useState(today);
  const [grab, setGrab] = useState<string>('');
  const [tip, setTip] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [oil, setOil] = useState<string>('');
  const [oilReal, setOilReal] = useState<string>('');
  const [credit, setCredit] = useState<string>('');
  const [withdraw, setWithdraw] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [notifyLine, setNotifyLine] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    try {
      const auto = localStorage.getItem('grab_line_auto');
      if (auto !== null) {
        setNotifyLine(auto !== 'false');
      }
    } catch {}
  }, []);

  const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
  const rate = fuelSettings.rate_km_per_l || 71.4;

  // Handle Distance Input -> Auto Calculate Fuel
  const handleDistanceChange = (val: string) => {
    setDistance(val);
    const km = parseFloat(val);
    if (!isNaN(km) && km > 0) {
      const liters = km / rate;
      const estCost = liters * price;
      setOil(estCost.toFixed(2));
    }
  };

  // Calculations for live preview
  const numGrab = parseFloat(grab) || 0;
  const numTip = parseFloat(tip) || 0;
  const numOil = parseFloat(oil) || 0;
  const totalRev = numGrab + numTip;
  const netMargin = totalRev - numOil;
  const numDist = parseFloat(distance) || 0;
  const estLiters = numDist > 0 ? (numDist / rate).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setToast({ msg: 'กรุณาระบุวันที่รอบขับ', type: 'error' });
      return;
    }

    setLoading(true);
    setToast(null);

    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    const entryData = {
      id,
      date,
      grab: numGrab,
      tip: numTip,
      distance: numDist,
      oil: numOil,
      oil_real: parseFloat(oilReal) || 0,
      credit: parseFloat(credit) || 0,
      withdraw: parseFloat(withdraw) || 0,
      hours: parseFloat(hours) || 0,
      note: note.trim(),
    };

    try {
      const { error } = await supabase.from('entries').insert([entryData]);
      if (error) throw error;

      // LINE Notification trigger if enabled
      if (notifyLine) {
        try {
          const token = localStorage.getItem('grab_line_token');
          const userId = localStorage.getItem('grab_line_userid');
          if (token && userId) {
            await fetch('/api/notify-line', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entry: entryData,
                fuelSettings,
                token,
                userId,
              }),
            });
          }
        } catch (lineErr) {
          console.warn('LINE notify failed:', lineErr);
        }
      }

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
      });

      setToast({ msg: 'บันทึกข้อมูลรอบขับเรียบร้อยแล้ว', type: 'success' });
      // Reset numeric fields
      setGrab('');
      setTip('');
      setDistance('');
      setOil('');
      setOilReal('');
      setCredit('');
      setWithdraw('');
      setHours('');
      setNote('');
      onSuccess();
    } catch (err: any) {
      setToast({ msg: err.message || 'บันทึกข้อมูลไม่สำเร็จ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Toast Alert */}
      {toast && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium border shadow-sm transition ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline ml-3 cursor-pointer"
          >
            ปิด
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Form Inputs */}
        <div className="md:col-span-2 space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-5 sm:p-7 shadow-sm">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                บันทึกบัญชีรอบขับ
              </h2>
              <p className="text-xs text-slate-400">
                กรอกระยะทางเพื่อคำนวณค่าน้ำมันตามราคาตลาดสดทันที
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/80">
              <span>น้ำมัน ฿{price.toFixed(2)}/L</span>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              วันที่วิ่งงาน
            </label>
            <ThaiDatePicker value={date} onChange={setDate} />
          </div>

          {/* Income Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                รายได้ Grab (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={grab}
                  onChange={(e) => setGrab(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ทิปมือจากลูกค้า (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Distance & Computed Fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  ระยะทางไมล์ (กม.)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">สูตร {rate} กม./ลิตร</span>
              </div>
              <input
                type="number"
                step="any"
                value={distance}
                onChange={(e) => handleDistanceChange(e.target.value)}
                placeholder="ระบุระยะทางเพื่อคิดค่าน้ำมันอัตโนมัติ"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  ค่าน้ำมันตามสูตร (บาท)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Auto Calculated</span>
              </div>
              <input
                type="number"
                step="any"
                value={oil}
                onChange={(e) => setOil(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/30 dark:bg-emerald-950/20 px-3.5 py-2.5 text-sm font-mono-num font-semibold text-emerald-700 dark:text-emerald-300 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Secondary Details: Real Oil, Hours, Credit, Withdraw */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                ค่าน้ำมันจริง (ปั๊ม)
              </label>
              <input
                type="number"
                step="any"
                value={oilReal}
                onChange={(e) => setOilReal(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono-num text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                เวลาขับ (ชม.)
              </label>
              <input
                type="number"
                step="any"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono-num text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                เติมเครดิต (บาท)
              </label>
              <input
                type="number"
                step="any"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono-num text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                ถอนเงิน (บาท)
              </label>
              <input
                type="number"
                step="any"
                value={withdraw}
                onChange={(e) => setWithdraw(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono-num text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              หมายเหตุรอบขับ (เช่น อินพิเศษ, อินเพชร หรือพื้นที่งาน)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ระบุข้อความบันทึกช่วยจำ..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Notification Checkbox */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={notifyLine}
                onChange={(e) => setNotifyLine(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>ส่งสรุปยอดผ่าน LINE Flex Message อัตโนมัติ</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-glow-emerald"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>บันทึกรอบขับวันนี้</span>
              </>
            )}
          </button>
        </div>

        {/* Right 1 Col: Live Slip Telemetry (Cockpit Receipt) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c131f] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                ใบประเมินรอบขับ
              </span>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                LIVE PREVIEW
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่</span>
                <span className="font-mono-num font-medium text-slate-800 dark:text-slate-200">{fmtDateSlash(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">รายได้ Grab</span>
                <span className="font-mono-num font-medium text-slate-800 dark:text-slate-200">฿{fmt(numGrab)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ทิปมือ</span>
                <span className="font-mono-num font-medium text-amber-600 dark:text-amber-400">฿{fmt(numTip)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 font-medium">
                <span className="text-slate-700 dark:text-slate-300">รวมรายได้</span>
                <span className="font-mono-num text-slate-900 dark:text-white">฿{fmt(totalRev)}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>หักค่าน้ำมัน ({estLiters} ลิตร)</span>
                <span className="font-mono-num">-฿{fmt(numOil)}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-slate-300 dark:border-slate-700 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                กำไรสุทธิรอบขับ (Net Profit)
              </span>
              <div className={`text-2xl font-black font-mono-num ${netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                ฿{fmt(netMargin)}
              </div>
            </div>

            {numDist > 0 && totalRev > 0 && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                เฉลี่ย <strong>฿{(totalRev / numDist).toFixed(2)}</strong> /กม. • น้ำมัน <strong>฿{(numOil / numDist).toFixed(2)}</strong> /กม.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <div className="font-medium text-slate-700 dark:text-slate-300">💡 เคล็ดลับคนขับ</div>
            <p>
              หากมีคำว่า <strong>"อินพิเศษ"</strong> หรือ <strong>"อินเพชร"</strong> ในช่องหมายเหตุ ระบบจะจัดกลุ่มและติดป้ายกำกับโบนัสให้อัตโนมัติในหน้าประวัติรอบขับ
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
