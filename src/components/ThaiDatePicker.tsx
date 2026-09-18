'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { TH_MONTHS, TH_DOWS_S, getTodayThai, fmtDateSlash, fmtDateTh } from '@/lib/utils';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
}

export default function ThaiDatePicker({
  value,
  onChange,
  label = '📅 วันที่',
  required = true,
}: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to Thailand today
  const selectedDate = value || getTodayThai();
  const [selY, selM, selD] = selectedDate.split('-').map(Number);

  // View state for browsing calendar months
  const [viewYear, setViewYear] = useState(selY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState((selM || (new Date().getMonth() + 1)) - 1); // 0-indexed

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const yStr = String(viewYear);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = getTodayThai();
    onChange(today);
    const [y, m] = today.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setIsOpen(false);
  };

  const handleSelectYesterday = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const yesterday = `${y}-${m}-${d}`;
    onChange(yesterday);
    setViewYear(y);
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const todayStr = getTodayThai();
  const displaySlash = fmtDateSlash(selectedDate); // DD/MM/YYYY
  const displayThaiLong = fmtDateTh(selectedDate); // 18 ก.ย. 2569 (ศ.)

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Input button showing DD/MM/YYYY */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-900 hover:border-emerald-500 hover:bg-white focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-mono text-base tracking-wide text-emerald-700 dark:text-emerald-400 font-bold">
            {displaySlash}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">
            ({displayThaiLong})
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 uppercase">
          เลือก ▾
        </span>
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Popup Calendar Dropdown */}
      {isOpen && (
        <div className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-1/2 -translate-y-1/2 sm:top-full sm:translate-y-0 z-50 mt-0 sm:mt-2 w-[calc(100vw-2.5rem)] sm:w-80 max-w-xs sm:max-w-none rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header with Thai Month & Year (ค.ศ. / พ.ศ.) */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {TH_MONTHS[viewMonth]} {viewYear + 543}
              </span>
              <span className="block text-[11px] text-slate-400">
                ({viewYear})
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Thai Weekday Headers: อา, จ, อ, พ, พฤ, ศ, ส */}
          <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-slate-400">
            {TH_DOWS_S.map((dow, idx) => (
              <span
                key={dow}
                className={idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-purple-500' : ''}
              >
                {dow}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {/* Blank padding for day offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-9 w-9 sm:h-8 sm:w-8 mx-auto" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateKey;
              const isToday = todayStr === dateKey;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`flex h-9 w-9 sm:h-8 sm:w-8 mx-auto items-center justify-center rounded-xl sm:rounded-lg text-xs font-semibold transition active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : isToday
                      ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Buttons: วันนี้, เมื่อวาน */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSelectYesterday}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              เมื่อวาน
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
            >
              วันนี้ ({fmtDateSlash(todayStr)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
