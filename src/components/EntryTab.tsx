'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, getTodayThai, fmtDateSlash } from '@/lib/utils';
import { FuelSettings } from '@/types';
import confetti from 'canvas-confetti';
import { Save, Sparkles, Fuel, Bike, DollarSign, Wallet, ArrowDownRight, Clock, StickyNote } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  // Preview calculations
  const numGrab = parseFloat(grab) || 0;
  const numTip = parseFloat(tip) || 0;
  const numOil = parseFloat(oil) || 0;
  const prevIncome = numGrab + numTip;
  const prevProfit = prevIncome - numOil;

  // Real oil liters tag
  const numRealOil = parseFloat(oilReal) || 0;
  const realLiters = numRealOil > 0 ? (numRealOil / price).toFixed(2) : '0.00';

  const numDist = parseFloat(distance) || 0;
  const estLiters = numDist > 0 ? (numDist / rate).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setToast({ msg: 'กรุณาระบุวันที่', type: 'error' });
      return;
    }

    setLoading(true);
    setToast(null);

    const id = Date.now() + Math.random().toString(36).slice(2, 6);

    const payload = {
      id,
      date,
      grab: numGrab,
      tip: numTip,
      distance: numDist > 0 ? numDist : null,
      oil: numOil,
      oil_real: numRealOil,
      credit: parseFloat(credit) || 0,
      withdraw: parseFloat(withdraw) || 0,
      hours: parseFloat(hours) || null,
      note: note.trim(),
    };

    try {
      const { error } = await supabase.from('entries').upsert(payload, { onConflict: 'date' });
      if (error) throw error;

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00b14f', '#10b981', '#3b82f6', '#f59e0b', '#ffd700']
      });

      setToast({ msg: `✅ บันทึกข้อมูลวันที่ ${date} สำเร็จแล้ว!`, type: 'success' });
      onSuccess();

      // Reset form fields
      setGrab('');
      setTip('');
      setDistance('');
      setOil('');
      setOilReal('');
      setCredit('');
      setWithdraw('');
      setHours('');
      setNote('');
    } catch (err: any) {
      setToast({ msg: `❌ เกิดข้อผิดพลาด: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>✍️ บันทึกบัญชี Grab ประจำวัน</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              กรอกระยะทางเพื่อคำนวณค่าน้ำมันอัตโนมัติ (Wave 125i @ {rate} กม./ลิตร)
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              ⛽ น้ำมัน {price.toFixed(2)} ฿
            </span>
          </div>
        </div>

        {toast && (
          <div className={`mt-4 rounded-xl p-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {toast.msg}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Thai Date Picker */}
          <div>
            <ThaiDatePicker
              value={date}
              onChange={setDate}
              label="📅 วันที่ทำงาน (วัน/เดือน/ปี)"
            />
          </div>

          {/* Grab Income */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              💚 รายได้จาก Grab (บาท)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={grab}
              onChange={(e) => setGrab(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Tip */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              👋 Tip มือ (บาท)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Work Hours */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ⏱️ ชั่วโมงขับ (ชม.)
            </label>
            <input
              type="number"
              step="any"
              placeholder="เช่น 3 หรือ 4.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>
        </div>

        {/* Distance & Smart Fuel Section */}
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Bike className="h-4 w-4 text-emerald-600" />
              <span>🛵 ระยะทางวิ่งงานวันนี้ (กิโลเมตร)</span>
            </label>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">คำนวณค่าน้ำมันอัตโนมัติ</span>
          </div>

          <input
            type="number"
            step="any"
            placeholder="เช่น 45 หรือ 85.5"
            value={distance}
            onChange={(e) => handleDistanceChange(e.target.value)}
            className="w-full rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-emerald-800 dark:bg-slate-900 dark:text-white transition"
          />

          {/* Quick Distance Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">ระยะทางด่วน:</span>
            {[40, 60, 80, 100, 120].map((km) => (
              <button
                type="button"
                key={km}
                onClick={() => handleDistanceChange(km.toString())}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-slate-800 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-slate-700 transition"
              >
                {km} กม.
              </button>
            ))}
          </div>

          {numDist > 0 && (
            <div className="rounded-xl bg-emerald-100/70 p-3 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                วิ่ง <strong>{numDist.toFixed(1)} กม.</strong> = ใช้น้ำมัน <strong>{estLiters} ลิตร</strong> (ประมาณ <strong>{numOil.toFixed(2)} บาท</strong> @ {price.toFixed(2)} ฿/ลิตร)
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Oil Est */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ⛽ ค่าน้ำมัน (ประมาณการ - บาท)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={oil}
                onChange={(e) => setOil(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white transition"
              />
            </div>

            {/* Oil Real */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ⛽ เติมน้ำมันจริง (บาท)
              </label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 100"
                value={oilReal}
                onChange={(e) => setOilReal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white transition"
              />
              {numRealOil > 0 && (
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  💡 เติม {numRealOil.toFixed(2)} บ. = ได้น้ำมัน <strong>{realLiters} ลิตร</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Banking & Credits */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              💳 เติมเครดิต Grab (บาท)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              🏦 ถอนเข้ากรุงศรี (บาท)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={withdraw}
              onChange={(e) => setWithdraw(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            📝 หมายเหตุ
          </label>
          <input
            type="text"
            placeholder="เช่น อินพิเศษ 32 บาท, ขาดงาน, หยุด"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
          />
        </div>

        {/* Live Preview Bar */}
        <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white dark:bg-slate-800">
          <div>
            <div className="text-xs text-slate-400">รายได้รวมวันนี้</div>
            <div className="text-lg font-bold text-emerald-400">{fmt(prevIncome)} บาท</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">กำไรสุทธิ (หักน้ำมัน)</div>
            <div className={`text-xl font-black ${prevProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmt(prevProfit)} บาท
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-green-500 focus:outline-none disabled:opacity-50 transition"
        >
          <Save className="h-4 w-4" />
          {loading ? 'กำลังบันทึกลง Supabase...' : '💾 บันทึกข้อมูลวันนี้'}
        </button>
      </form>
    </div>
  );
}
