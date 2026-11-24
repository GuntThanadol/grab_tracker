'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Clock, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  calcDurationFromTimeRange,
  decimalHoursToHM,
  formatDuration,
  hmToDecimalHours,
} from '@/lib/utils';

interface DurationInputProps {
  value: number | null;
  onChange: (decimalHours: number | null) => void;
  compact?: boolean;
  defaultHint?: string;
  label?: string;
}

const MINUTE_CHIPS = [0, 10, 15, 20, 30, 45];

const DURATION_PRESETS = [
  { h: 2, m: 0, label: '2 ชม.' },
  { h: 3, m: 0, label: '3 ชม.' },
  { h: 3, m: 30, label: '3 ชม. 30 น.' },
  { h: 4, m: 0, label: '4 ชม.' },
  { h: 5, m: 0, label: '5 ชม.' },
  { h: 6, m: 0, label: '6 ชม.' },
];

function normalizeDecimalProp(val: number | null): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Number(num.toFixed(2));
}

function getBangkokNowHHMM(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function DurationInput({
  value,
  onChange,
  compact = false,
  defaultHint,
  label = '⏱️ เวลาที่ขับ (ชั่วโมง / นาที)',
}: DurationInputProps) {
  const baseId = useId();
  const initialProp = normalizeDecimalProp(value);
  const initialHM = decimalHoursToHM(initialProp);

  const [hoursStr, setHoursStr] = useState<string>(() =>
    initialHM.hours > 0 ? String(initialHM.hours) : ''
  );
  const [minutesStr, setMinutesStr] = useState<string>(() =>
    initialHM.minutes > 0 ? String(initialHM.minutes) : ''
  );
  const [mode, setMode] = useState<'hm' | 'range'>('hm');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  const lastEmittedRef = useRef<number | null>(initialProp);

  const emitHM = (h: number, m: number) => {
    const dec = hmToDecimalHours(h, m);
    lastEmittedRef.current = dec;
    onChange(dec);
  };

  useEffect(() => {
    const normalizedProp = normalizeDecimalProp(value);
    if (normalizedProp === lastEmittedRef.current) return;

    lastEmittedRef.current = normalizedProp;
    if (normalizedProp === null) {
      setHoursStr('');
      setMinutesStr('');
      setStartTime('');
      setEndTime('');
      return;
    }

    const { hours, minutes } = decimalHoursToHM(normalizedProp);
    setHoursStr(hours > 0 ? String(hours) : '');
    setMinutesStr(minutes > 0 ? String(minutes) : '');
  }, [value]);

  const curH = hoursStr === '' ? 0 : Math.min(99, parseInt(hoursStr, 10) || 0);
  const curM = minutesStr === '' ? 0 : parseInt(minutesStr, 10) || 0;
  const totalMinutes = curH * 60 + curM;
  const normalizedMinutes = totalMinutes % 60;
  const previewDecimal = hmToDecimalHours(curH, curM);

  const handleHoursInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setHoursStr(digits);
    const nextH = digits === '' ? 0 : Math.min(99, parseInt(digits, 10));
    emitHM(nextH, curM);
  };

  const handleHoursBlur = () => {
    setHoursStr(curH > 0 ? String(curH) : '');
  };

  const stepHours = (delta: number) => {
    const nextH = Math.max(0, Math.min(99, curH + delta));
    setHoursStr(nextH > 0 ? String(nextH) : '');
    emitHM(nextH, curM);
  };

  const handleMinutesInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    setMinutesStr(digits);
    const nextM = digits === '' ? 0 : parseInt(digits, 10);
    emitHM(curH, nextM);
  };

  const handleMinutesBlur = () => {
    const clampedTotal = Math.min(99 * 60 + 59, curH * 60 + curM);
    const normH = Math.floor(clampedTotal / 60);
    const normM = clampedTotal % 60;
    setHoursStr(normH > 0 ? String(normH) : '');
    setMinutesStr(normM > 0 ? String(normM) : '');
    emitHM(normH, normM);
  };

  const stepMinutes = (delta: number) => {
    const nextTotal = Math.max(0, Math.min(99 * 60 + 59, totalMinutes + delta));
    const nextH = Math.floor(nextTotal / 60);
    const nextM = nextTotal % 60;
    setHoursStr(nextH > 0 ? String(nextH) : '');
    setMinutesStr(nextM > 0 ? String(nextM) : '');
    emitHM(nextH, nextM);
  };

  const handleQuickMinute = (m: number) => {
    setMinutesStr(m > 0 ? String(m) : '');
    emitHM(curH, m);
  };

  const handlePreset = (h: number, m: number) => {
    setHoursStr(String(h));
    setMinutesStr(m > 0 ? String(m) : '');
    emitHM(h, m);
  };

  const handleClear = () => {
    setHoursStr('');
    setMinutesStr('');
    setStartTime('');
    setEndTime('');
    emitHM(0, 0);
  };

  const handleRangeChange = (nextStart: string, nextEnd: string) => {
    setStartTime(nextStart);
    setEndTime(nextEnd);
    if (nextStart && nextEnd) {
      const res = calcDurationFromTimeRange(nextStart, nextEnd);
      if (res) {
        setHoursStr(res.hours > 0 ? String(res.hours) : '');
        setMinutesStr(res.minutes > 0 ? String(res.minutes) : '');
        emitHM(res.hours, res.minutes);
      }
    }
  };

  const rangeResult =
    startTime && endTime ? calcDurationFromTimeRange(startTime, endTime) : null;
  const isSameTime = Boolean(startTime && endTime && startTime === endTime);

  return (
    <div
      className={`rounded-2xl border border-indigo-200/80 bg-indigo-50/35 dark:border-indigo-900/50 dark:bg-indigo-950/20 ${
        compact ? 'p-3 space-y-2.5' : 'p-3.5 sm:p-4 space-y-3'
      }`}
    >
      {/* Header + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <label
            htmlFor={`${baseId}-hours`}
            className="text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
          {defaultHint && (
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
              {defaultHint}
            </span>
          )}
        </div>

        <div className="inline-flex items-center rounded-xl border border-indigo-200/80 bg-white/90 p-0.5 dark:border-indigo-800/70 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setMode('hm')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === 'hm'
                ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                : 'text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>ชม./นาที</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('range')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              mode === 'range'
                ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                : 'text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300'
            }`}
          >
            <ArrowRight className="h-3 w-3" />
            <span>เริ่ม–เลิก</span>
          </button>
        </div>
      </div>

      {mode === 'hm' ? (
        <>
          {/* Hours + Minutes Stepper Inputs */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Hours */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                ชั่วโมง (ชม.)
              </span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition">
                <button
                  type="button"
                  aria-label="ลดชั่วโมง"
                  onClick={() => stepHours(-1)}
                  disabled={curH <= 0}
                  className="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center border-r border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 active:scale-95 transition"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex flex-1 items-center justify-center px-1.5">
                  <input
                    id={`${baseId}-hours`}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={hoursStr}
                    onChange={(e) => handleHoursInputChange(e.target.value)}
                    onBlur={handleHoursBlur}
                    className="w-full bg-transparent text-center font-mono text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
                  />
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                    ชม.
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="เพิ่มชั่วโมง"
                  onClick={() => stepHours(1)}
                  disabled={curH >= 99}
                  className="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Minutes */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                นาที (น.)
              </span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition">
                <button
                  type="button"
                  aria-label="ลด 5 นาที"
                  onClick={() => stepMinutes(-5)}
                  disabled={totalMinutes <= 0}
                  className="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center border-r border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 active:scale-95 transition"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="flex flex-1 items-center justify-center px-1.5">
                  <input
                    id={`${baseId}-minutes`}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={minutesStr}
                    onChange={(e) => handleMinutesInputChange(e.target.value)}
                    onBlur={handleMinutesBlur}
                    className="w-full bg-transparent text-center font-mono text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
                  />
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                    น.
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="เพิ่ม 5 นาที"
                  onClick={() => stepMinutes(5)}
                  disabled={totalMinutes >= 99 * 60 + 59}
                  className="flex h-10 w-9 sm:w-10 shrink-0 items-center justify-center border-l border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-35 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/60 active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Minute Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-0.5">
              นาที:
            </span>
            {MINUTE_CHIPS.map((m) => {
              const isActive = totalMinutes > 0 && normalizedMinutes === m;
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleQuickMinute(m)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition active:scale-95 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm dark:bg-indigo-500 dark:border-indigo-500'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/70 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                  }`}
                >
                  {m === 0 ? '00 น.' : `${m} น.`}
                </button>
              );
            })}
          </div>

          {/* Quick Duration Presets (full mode) */}
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-0.5">
                ใช้บ่อย:
              </span>
              {DURATION_PRESETS.map((preset) => {
                const presetTotal = preset.h * 60 + preset.m;
                const isActive = totalMinutes === presetTotal;
                return (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => handlePreset(preset.h, preset.m)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition active:scale-95 ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm dark:bg-indigo-500 dark:border-indigo-500'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {totalMinutes > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>ล้าง</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* Mode 2: Start Time -> End Time Calculator */
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label
                htmlFor={`${baseId}-start`}
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                🟢 เริ่มวิ่ง (เวลา)
              </label>
              <input
                id={`${baseId}-start`}
                type="time"
                value={startTime}
                onChange={(e) => handleRangeChange(e.target.value, endTime)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`${baseId}-end`}
                  className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  🏁 เลิกวิ่ง (เวลา)
                </label>
                <button
                  type="button"
                  onClick={() => handleRangeChange(startTime, getBangkokNowHHMM())}
                  className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  ตอนนี้
                </button>
              </div>
              <input
                id={`${baseId}-end`}
                type="time"
                value={endTime}
                onChange={(e) => handleRangeChange(startTime, e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white transition"
              />
            </div>
          </div>

          {rangeResult?.crossedMidnight && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-indigo-100/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
              🌙 ข้ามเที่ยงคืน (+1 วัน)
            </div>
          )}

          {isSameTime && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
              ⚠️ เวลาเริ่มและเวลาเลิกตรงกัน
            </div>
          )}
        </div>
      )}

      {/* Live Summary Footer */}
      {previewDecimal !== null && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-100/75 px-3 py-2 text-xs text-indigo-950 dark:bg-indigo-900/40 dark:text-indigo-100">
          <div className="flex items-center gap-1.5">
            <span>⏱️ รวมเวลาขับ:</span>
            <strong className="font-bold">{formatDuration(previewDecimal, 'full')}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
              ({previewDecimal.toFixed(2)} ชม.)
            </span>
            {compact && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-white/70 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>ล้าง</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
