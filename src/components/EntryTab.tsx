'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthorizationHeaders } from '@/lib/auth';
import {
  fmt,
  fmtDateSlash,
  getTodayThai,
  setLocalCustomTrip,
  setLocalCustomOdometer,
  getPreviousOdometerInfo,
  odometerValue,
} from '@/lib/utils';
import { Entry, FuelSettings } from '@/types';
import confetti from 'canvas-confetti';
import { Save, Sparkles, Bike, Gauge, ArrowRight } from 'lucide-react';
import ThaiDatePicker from './ThaiDatePicker';
import DurationInput from './DurationInput';

const DRAFT_STORAGE_KEY = 'grab_entry_form_draft';

interface EntryDraft {
  date?: string;
  grab?: string;
  tip?: string;
  trips?: string;
  prevOdometer?: string;
  prevOdoManual?: boolean;
  odometer?: string;
  distance?: string;
  oil?: string;
  oilReal?: string;
  credit?: string;
  withdraw?: string;
  hours?: string;
  note?: string;
}

function loadDraft(): EntryDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EntryDraft) : {};
  } catch {
    return {};
  }
}

interface EntryTabProps {
  entries: Entry[];
  fuelSettings: FuelSettings;
  onSuccess: () => void;
}

export default function EntryTab({ entries, fuelSettings, onSuccess }: EntryTabProps) {
  const today = getTodayThai();
  const initialDraft = useMemo(() => loadDraft(), []);
  const [date, setDate] = useState(() => initialDraft.date || today);
  const [grab, setGrab] = useState<string>(() => initialDraft.grab ?? '');
  const [tip, setTip] = useState<string>(() => initialDraft.tip ?? '');
  const [trips, setTrips] = useState<string>(() => initialDraft.trips ?? '');
  const [prevOdometer, setPrevOdometer] = useState<string>(() => initialDraft.prevOdometer ?? '');
  const [prevOdoManual, setPrevOdoManual] = useState<boolean>(() => initialDraft.prevOdoManual ?? false);
  const [odometer, setOdometer] = useState<string>(() => initialDraft.odometer ?? '');
  const [distance, setDistance] = useState<string>(() => initialDraft.distance ?? '');
  const [oil, setOil] = useState<string>(() => initialDraft.oil ?? '');
  const [oilReal, setOilReal] = useState<string>(() => initialDraft.oilReal ?? '');
  const [credit, setCredit] = useState<string>(() => initialDraft.credit ?? '');
  const [withdraw, setWithdraw] = useState<string>(() => initialDraft.withdraw ?? '');
  const [hours, setHours] = useState<number | null>(() => {
    if (!initialDraft.hours) return null;
    const parsed = parseFloat(initialDraft.hours);
    return !isNaN(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
  });
  const [note, setNote] = useState<string>(() => initialDraft.note ?? '');
  const [notifyLine, setNotifyLine] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const auto = localStorage.getItem('grab_line_auto');
      return auto !== null ? auto !== 'false' : true;
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Persist draft fields automatically so data isn't lost on tab switch or refresh
  useEffect(() => {
    try {
      const draft: EntryDraft = {
        date,
        grab,
        tip,
        trips,
        prevOdometer,
        prevOdoManual,
        odometer,
        distance,
        oil,
        oilReal,
        credit,
        withdraw,
        hours: hours !== null && hours > 0 ? String(hours) : '',
        note,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
  }, [
    date,
    grab,
    tip,
    trips,
    prevOdometer,
    prevOdoManual,
    odometer,
    distance,
    oil,
    oilReal,
    credit,
    withdraw,
    hours,
    note,
  ]);

  const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
  const rate = fuelSettings.rate_km_per_l || 71.4;

  // Lookup latest odometer reading strictly before the selected date
  const prevOdoInfo = useMemo(() => getPreviousOdometerInfo(entries, date), [entries, date]);
  const existingTodayOdo = useMemo(() => {
    const match = entries.find((r) => r.date === date);
    return match ? odometerValue(match) : null;
  }, [entries, date]);

  const effectivePrevOdo = prevOdoManual
    ? prevOdometer
    : prevOdoInfo
    ? String(prevOdoInfo.odometer)
    : prevOdometer;

  // Handle Distance Input -> Auto Calculate Fuel
  const handleDistanceChange = (val: string) => {
    setDistance(val);
    const km = parseFloat(val);
    if (!isNaN(km) && km > 0) {
      const liters = km / rate;
      const estCost = liters * price;
      setOil(estCost.toFixed(2));
    } else if (val === '' || km === 0) {
      setOil('');
    }
  };

  // Handle Today's Odometer Input -> Auto Subtract Previous Odometer -> Auto Calculate Distance & Fuel
  const handleOdometerChange = (val: string) => {
    setOdometer(val);
    const cur = parseFloat(val);
    const prev = parseFloat(effectivePrevOdo);
    if (!isNaN(cur) && !isNaN(prev) && prev > 0 && cur >= prev) {
      const diff = parseFloat((cur - prev).toFixed(1));
      handleDistanceChange(diff.toString());
    }
  };

  // Handle Previous / Yesterday's Odometer Input
  const handlePrevOdometerChange = (val: string) => {
    setPrevOdoManual(true);
    setPrevOdometer(val);
    const prev = parseFloat(val);
    const cur = parseFloat(odometer);
    if (!isNaN(cur) && !isNaN(prev) && prev > 0 && cur >= prev) {
      const diff = parseFloat((cur - prev).toFixed(1));
      handleDistanceChange(diff.toString());
    }
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setPrevOdoManual(false);
    setPrevOdometer('');
    const info = getPreviousOdometerInfo(entries, newDate);
    const cur = parseFloat(odometer);
    if (info && !isNaN(cur) && cur >= info.odometer) {
      const diff = parseFloat((cur - info.odometer).toFixed(1));
      handleDistanceChange(diff.toString());
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

  const numPrevOdo = parseFloat(effectivePrevOdo);
  const numCurOdo = parseFloat(odometer);
  const odoDiff =
    !isNaN(numPrevOdo) && numPrevOdo > 0 && !isNaN(numCurOdo) && numCurOdo > 0
      ? parseFloat((numCurOdo - numPrevOdo).toFixed(1))
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setToast({ msg: 'กรุณาระบุวันที่', type: 'error' });
      return;
    }

    setLoading(true);
    setToast(null);

    const id = Date.now() + Math.random().toString(36).slice(2, 6);

    const parsedTrips = parseInt(trips, 10);
    const finalTrips = !isNaN(parsedTrips) && parsedTrips > 0 ? parsedTrips : null;

    const parsedOdo = parseFloat(odometer);
    const finalOdometer = !isNaN(parsedOdo) && parsedOdo > 0 ? parseFloat(parsedOdo.toFixed(1)) : null;

    const isWorkDay = numGrab > 0 || numDist > 0 || numOil > 0 || (finalTrips !== null && finalTrips > 0);
    const finalHours = hours !== null && hours > 0 ? hours : (isWorkDay ? 3 : null);

    const basePayload = {
      id,
      date,
      grab: numGrab,
      tip: numTip,
      distance: numDist > 0 ? numDist : null,
      oil: numOil,
      oil_real: numRealOil,
      credit: parseFloat(credit) || 0,
      withdraw: parseFloat(withdraw) || 0,
      hours: finalHours,
      note: note.trim(),
    };

    const payloadWithTrips = {
      ...basePayload,
      trips: finalTrips,
    };

    const fullPayload = {
      ...payloadWithTrips,
      odometer: finalOdometer,
    };

    try {
      setLocalCustomTrip(date, finalTrips);
      if (finalOdometer !== null) {
        setLocalCustomOdometer(date, finalOdometer);
      }
      // If user also provided a manual starting odometer and there was no previous record, save it for the day before
      if (!prevOdoInfo && !isNaN(numPrevOdo) && numPrevOdo > 0) {
        const parts = date.split('-').map(Number);
        if (parts.length === 3) {
          const prevDt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] - 1));
          const prevDateStr = prevDt.toISOString().slice(0, 10);
          setLocalCustomOdometer(prevDateStr, numPrevOdo);
        }
      }

      const { error } = await supabase.from('entries').upsert(fullPayload, { onConflict: 'date' });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('odometer') && !msg.includes('trips')) {
          const { error: retryTripsErr } = await supabase.from('entries').upsert(payloadWithTrips, { onConflict: 'date' });
          if (retryTripsErr) {
            const retryMsg = (retryTripsErr.message || '').toLowerCase();
            if (retryMsg.includes('trips')) {
              const { error: fallbackErr } = await supabase.from('entries').upsert(basePayload, { onConflict: 'date' });
              if (fallbackErr) throw fallbackErr;
            } else {
              throw retryTripsErr;
            }
          }
        } else if (msg.includes('trips') || msg.includes('odometer')) {
          const { error: fallbackErr } = await supabase.from('entries').upsert(basePayload, { onConflict: 'date' });
          if (fallbackErr) throw fallbackErr;
        } else {
          throw error;
        }
      }

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00b14f', '#10b981', '#3b82f6', '#f59e0b', '#ffd700']
      });

      // Send LINE notification if enabled
      let lineNote = '';
      if (notifyLine) {
        try {
          const authorizationHeaders = await getAuthorizationHeaders();
          const lineRes = await fetch('/api/notify-line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authorizationHeaders },
            body: JSON.stringify({ entry: fullPayload }),
          });
          const lineData = await lineRes.json();
          if (lineData.success) {
            lineNote = ' และส่งแจ้งเตือนเข้า LINE แล้ว 📲';
          }
        } catch {
          // ignore notification error so entry save succeeds
        }
      }

      setToast({ msg: `✅ บันทึกข้อมูลวันที่ ${date} สำเร็จแล้ว!${lineNote}`, type: 'success' });

      // Reset form fields & clear saved draft
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
      setGrab('');
      setTip('');
      setTrips('');
      setOdometer('');
      setPrevOdoManual(false);
      setPrevOdometer('');
      setDistance('');
      setOil('');
      setOilReal('');
      setCredit('');
      setWithdraw('');
      setHours(null);
      setNote('');

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลได้';
      setToast({ msg: `❌ เกิดข้อผิดพลาด: ${message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-2">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>✍️ บันทึกบัญชี Grab ประจำวัน</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              กรอกระยะทางเพื่อคำนวณค่าน้ำมันอัตโนมัติ (Wave 125i @ {rate} กม./ลิตร)
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              ⛽ {price.toFixed(2)} ฿
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

        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2">
          {/* Thai Date Picker */}
          <div>
            <ThaiDatePicker
              value={date}
              onChange={handleDateChange}
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
              inputMode="decimal"
              step="any"
              placeholder="0.00"
              value={grab}
              onChange={(e) => setGrab(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Tip */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              👋 Tip มือ (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="0.00"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Trips Count (จำนวนงาน) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              🛵 จำนวนงานที่วิ่งได้ (งาน)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="เช่น 8 หรือ 12"
              value={trips}
              onChange={(e) => setTrips(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-violet-50/40 px-3.5 py-2.5 text-base sm:text-sm font-bold text-violet-700 focus:border-violet-500 focus:bg-white focus:outline-none dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 transition"
            />
          </div>

          {/* Work Hours */}
          <div className="sm:col-span-2">
            <DurationInput
              value={hours}
              onChange={setHours}
              defaultHint="- เว้นว่างไว้ใส่ 3 ชม."
            />
          </div>
        </div>

        {/* Distance & Smart Fuel Section */}
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-4">
          {/* Odometer Auto-Subtract Box */}
          <div className="rounded-xl border border-blue-200/80 bg-white/90 p-3.5 sm:p-4 dark:border-blue-900/50 dark:bg-slate-900/90 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>📟 กรอกเลขไมล์หน้าปัดมอเตอร์ไซค์ (ลบเลขไมล์ให้อัตโนมัติ)</span>
              </div>
              {prevOdoInfo && !prevOdoManual ? (
                <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  ดึงไมล์ล่าสุดจาก {fmtDateSlash(prevOdoInfo.date)}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  บันทึกวันนี้แล้ว พรุ่งนี้ดึงเลขไมล์เมื่อวานให้อัตโนมัติ
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Previous / Yesterday Odometer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    ⏪ เลขไมล์ครั้งก่อน / เมื่อวาน (กม.)
                  </label>
                  {prevOdoManual && prevOdoInfo && (
                    <button
                      type="button"
                      onClick={() => {
                        setPrevOdoManual(false);
                        setPrevOdometer('');
                        const cur = parseFloat(odometer);
                        if (!isNaN(cur) && cur >= prevOdoInfo.odometer) {
                          handleDistanceChange(parseFloat((cur - prevOdoInfo.odometer).toFixed(1)).toString());
                        }
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      ใช้ค่าเดิม ({prevOdoInfo.odometer.toLocaleString('th-TH')})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="เช่น 25400 (กรอกครั้งแรก)"
                  value={effectivePrevOdo}
                  onChange={(e) => handlePrevOdometerChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                />
              </div>

              {/* Today's Odometer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-300">
                    🏍️ เลขไมล์หน้าปัดวันนี้ (กม.)
                  </label>
                  {existingTodayOdo !== null && (
                    <span className="text-[10px] text-slate-400">
                      ที่บันทึกไว้: {existingTodayOdo.toLocaleString('th-TH')}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder={
                    !isNaN(numPrevOdo) && numPrevOdo > 0
                      ? `เช่น ${(numPrevOdo + 60).toFixed(0)}`
                      : 'กรอกเลขไมล์หน้าปัดวันนี้'
                  }
                  value={odometer}
                  onChange={(e) => handleOdometerChange(e.target.value)}
                  className="w-full rounded-xl border border-blue-300 bg-blue-50/40 px-3.5 py-2.5 text-base sm:text-sm font-bold text-blue-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200 transition"
                />
              </div>
            </div>

            {odoDiff !== null && odoDiff >= 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50/80 px-3 py-2 text-xs text-blue-900 dark:bg-blue-950/50 dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/60">
                <div className="flex items-center gap-1.5 font-medium">
                  <span>เลขไมล์:</span>
                  <strong className="font-mono">{numPrevOdo.toLocaleString('th-TH')}</strong>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                  <strong className="font-mono">{numCurOdo.toLocaleString('th-TH')}</strong>
                  <span>กม.</span>
                </div>
                <div className="font-bold text-emerald-700 dark:text-emerald-400">
                  = วิ่งงานวันนี้ {odoDiff.toFixed(1)} กม. ✨
                </div>
              </div>
            )}

            {odoDiff !== null && odoDiff < 0 && (
              <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                ⚠️ เลขไมล์วันนี้ ({numCurOdo.toLocaleString('th-TH')}) น้อยกว่าเลขไมล์ครั้งก่อน ({numPrevOdo.toLocaleString('th-TH')})
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Bike className="h-4 w-4 text-emerald-600" />
              <span>🛵 ระยะทางวิ่งงานวันนี้ (กิโลเมตร)</span>
            </label>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">คำนวณค่าน้ำมันอัตโนมัติ (หรือกรอกเองได้)</span>
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
                inputMode="decimal"
                step="any"
                placeholder="0.00"
                value={oil}
                onChange={(e) => setOil(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white transition"
              />
            </div>

            {/* Oil Real */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ⛽ เติมน้ำมันจริง (บาท)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="เช่น 100"
                value={oilReal}
                onChange={(e) => setOilReal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white transition"
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
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              💳 เติมเครดิต Grab (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="0.00"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              🏦 ถอนเข้ากรุงศรี (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="0.00"
              value={withdraw}
              onChange={(e) => setWithdraw(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
          />
        </div>

        {/* Live Preview Bar */}
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-900 p-4 sm:p-5 text-white dark:bg-slate-800 shadow-md">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">รายได้รวมวันนี้</div>
            <div className="text-base sm:text-xl font-bold text-emerald-400">{fmt(prevIncome)} ฿</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium">กำไรสุทธิ (หักน้ำมัน)</div>
            <div className={`text-lg sm:text-2xl font-black ${prevProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmt(prevProfit)} ฿
            </div>
          </div>
        </div>

        {/* LINE Notification Toggle */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyLine}
              onChange={(e) => setNotifyLine(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>💬 ส่งการ์ดสรุปเข้า LINE ทันทีเมื่อบันทึก</span>
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 py-4 text-base font-bold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-green-500 focus:outline-none active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
        >
          <Save className="h-5 w-5" />
          {loading ? 'กำลังบันทึกลง Supabase...' : '💾 บันทึกข้อมูลวันนี้'}
        </button>
      </form>
    </div>
  );
}
