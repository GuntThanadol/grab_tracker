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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📅 สรุปผลการขับขี่แยกตามรายเดือน</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          วิเคราะห์รายรับ ค่าใช้จ่ายน้ำมัน และกำไรสุทธิในแต่ละเดือน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {monthlyStats.map((item) => (
          <div
            key={item.monthKey}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 transition hover:border-emerald-300 dark:hover:border-emerald-800"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="text-xs text-slate-500">
                    วิ่งงาน {item.workDays} วัน • หยุด {item.restDays} วัน
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">กำไรสุทธิ</span>
                <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {fmt(item.totalProf)} ฿
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium text-slate-500">รายได้รวม</div>
                <div className="mt-1 font-bold text-slate-900 dark:text-white">{fmt(item.totalInc)} ฿</div>
                <div className="text-[10px] text-slate-400">(เฉลี่ย {fmt(item.avgInc)}/วัน)</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium text-slate-500">ค่าน้ำมันประมาณ</div>
                <div className="mt-1 font-bold text-rose-600 dark:text-rose-400">{fmt(item.totalO)} ฿</div>
                <div className="text-[10px] text-slate-400">Wave 125i</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="text-[11px] font-medium text-slate-500">ระยะทางวิ่ง</div>
                <div className="mt-1 font-bold text-blue-600 dark:text-blue-400">{fmtInt(item.totalDist)} กม.</div>
                <div className="text-[10px] text-slate-400">เฉลี่ย {(item.workDays ? (item.totalDist / item.workDays).toFixed(1) : 0)} กม./วัน</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
