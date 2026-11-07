'use client';

import React, { useMemo } from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay, TH_MONTHS } from '@/lib/utils';
import { Calendar, TrendingUp, Bike, Fuel, Award, ArrowUpRight, Gauge } from 'lucide-react';

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

  if (monthlyStats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-12 text-center text-slate-500">
        ยังไม่มีข้อมูลรอบขับสำหรับสรุปผลรายเดือน
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            สรุปผลประกอบการรายเดือน
          </h2>
          <p className="text-xs text-slate-400">
            วิเคราะห์แนวโน้มรายได้ ค่าน้ำมัน และอัตราผลตอบแทนต่อวัน
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          รวม {monthlyStats.length} รอบเดือน
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {monthlyStats.map((item) => {
          const margin = item.totalInc > 0 ? (item.totalProf / item.totalInc) * 100 : 0;
          return (
            <div
              key={item.monthKey}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-5 sm:p-6 space-y-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>วิ่งงาน {item.workDays} วัน</span>
                    <span>•</span>
                    <span>พัก {item.restDays} วัน</span>
                    <span>•</span>
                    <span>{fmtInt(item.totalDist)} กม.</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium text-slate-400">กำไรสุทธิเดือนนี้</div>
                  <div className="text-xl font-black font-mono-num text-emerald-600 dark:text-emerald-400">
                    ฿{fmt(item.totalProf)}
                  </div>
                </div>
              </div>

              {/* Monthly Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="text-slate-400 text-[11px]">รายได้ Grab</div>
                  <div className="font-bold font-mono-num text-slate-900 dark:text-white mt-0.5">
                    ฿{fmt(item.totalGrab)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="text-slate-400 text-[11px]">ทิปมือ</div>
                  <div className="font-bold font-mono-num text-amber-600 dark:text-amber-400 mt-0.5">
                    ฿{fmt(item.totalTip)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="text-slate-400 text-[11px]">ค่าน้ำมันสะสม</div>
                  <div className="font-bold font-mono-num text-rose-600 dark:text-rose-400 mt-0.5">
                    ฿{fmt(item.totalO)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
                  <div className="text-slate-400 text-[11px]">อัตรากำไร (Margin)</div>
                  <div className="font-bold font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Bottom Averages */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                <span>เฉลี่ยวันละ <strong>฿{fmt(item.avgProf)}</strong></span>
                <span>รายรับเฉลี่ย <strong>฿{fmt(item.avgInc)}</strong>/วัน</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
