'use client';

import React, { useMemo } from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay, TH_MONTHS } from '@/lib/utils';
import { Calendar, TrendingUp, Bike, Fuel, Award } from 'lucide-react';

interface MonthlyTabProps {
  entries: Entry[];
}

export default function MonthlyTab({ entries }: MonthlyTabProps) {
  const monthlyStats = useMemo(() => {
    const groups: { [m: string]: Entry[] } = {};
    entries.forEach((r) => {
      const m = r.date.slice(0, 7);
      if (!groups[m]) groups[m] = [];
      groups[m].push(r);
    });

    const sortedMonths = Object.keys(groups).sort().reverse();

    return sortedMonths.map((m) => {
      const list = groups[m];
      const workList = list.filter(isWorkDay);
      const totalGrab = list.reduce((s, r) => s + (Number(r.grab) || 0), 0);
      const totalTip = list.reduce((s, r) => s + (Number(r.tip) || 0), 0);
      const totalInc = list.reduce((s, r) => s + income(r), 0);
      const totalO = list.reduce((s, r) => s + (Number(r.oil) || 0), 0);
      const totalDist = list.reduce((s, r) => s + (Number(r.distance) || 0), 0);
      const totalProf = list.reduce((s, r) => s + profit(r), 0);
      const avgProf = workList.length ? totalProf / workList.length : 0;
      const avgInc = workList.length ? totalInc / workList.length : 0;

      const [y, mo] = m.split('-');
      const thYear = parseInt(y, 10) + 543;
      const thMonthName = TH_MONTHS[parseInt(mo, 10) - 1] || m;

      return {
        monthKey: m,
        title: `${thMonthName} ${thYear}`,
        daysCount: list.length,
        workDays: workList.length,
        restDays: list.length - workList.length,
        totalGrab,
        totalTip,
        totalInc,
        totalO,
        totalDist,
        totalProf,
        avgProf,
        avgInc,
      };
    });
  }, [entries]);

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 led-beacon-green"></span>
          <span className="text-[10px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-bold uppercase">
            SEASON LOGS & TELEMETRY
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <span>📅 สรุปผลการขับขี่รายเดือน (Monthly Records)</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          วิเคราะห์รายรับ ค่าใช้จ่ายน้ำมัน และกำไรสุทธิต่อเดือน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {monthlyStats.map((item) => {
          const revKm = item.totalDist > 0 ? (item.totalInc / item.totalDist).toFixed(2) : '0.00';
          return (
            <div
              key={item.monthKey}
              className="cockpit-card rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-md dark:border-emerald-500/20 dark:bg-[#0c121e]/90 space-y-4 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/30">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{item.title}</h3>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      วิ่งงาน <strong className="text-emerald-600 dark:text-emerald-400">{item.workDays}</strong> วัน • พัก {item.restDays} วัน
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-600 dark:text-emerald-400 font-bold block">
                    NET PROFIT
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_6px_rgba(0,177,79,0.3)]">
                    {fmt(item.totalProf)} ฿
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">รายได้รวม (GROSS)</div>
                  <div className="mt-1 font-black font-mono text-slate-900 dark:text-white text-base">{fmt(item.totalInc)} ฿</div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">~{revKm} ฿/กม.</div>
                </div>

                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">ค่าน้ำมัน (FUEL)</div>
                  <div className="mt-1 font-black font-mono text-rose-600 dark:text-rose-400 text-base">{fmt(item.totalO)} ฿</div>
                  <div className="text-[10px] text-slate-400">Wave 125i</div>
                </div>

                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">ระยะทาง (ODOMETER)</div>
                  <div className="mt-1 font-black font-mono text-blue-600 dark:text-blue-400 text-base">{fmtInt(item.totalDist)} กม.</div>
                  <div className="text-[10px] font-mono text-slate-400">เฉลี่ย {(item.workDays ? (item.totalDist / item.workDays).toFixed(1) : 0)} กม./วัน</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
