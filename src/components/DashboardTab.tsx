'use client';

import React, { useState } from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay, fmtDateTh } from '@/lib/utils';
import { TrendingUp, Fuel, Bike, Wallet, ArrowDownRight, Clock, Award, DollarSign, CalendarCheck } from 'lucide-react';

interface DashboardTabProps {
  entries: Entry[];
}

export default function DashboardTab({ entries }: DashboardTabProps) {
  const [selectedBar, setSelectedBar] = useState<Entry | null>(null);

  const workRows = entries.filter(isWorkDay);
  const totalGrab = entries.reduce((s, r) => s + (Number(r.grab) || 0), 0);
  const totalTip = entries.reduce((s, r) => s + (Number(r.tip) || 0), 0);
  const totalIncome = entries.reduce((s, r) => s + income(r), 0);
  const totalOil = entries.reduce((s, r) => s + (Number(r.oil) || 0), 0);
  const totalOilReal = entries.reduce((s, r) => s + (Number(r.oil_real) || 0), 0);
  const totalDistance = entries.reduce((s, r) => s + (Number(r.distance) || 0), 0);
  const totalCredit = entries.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const totalWithdraw = entries.reduce((s, r) => s + (Number(r.withdraw) || 0), 0);
  const totalHours = entries.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const totalProfit = entries.reduce((s, r) => s + profit(r), 0);

  const avgProfit = workRows.length ? totalProfit / workRows.length : 0;
  const avgIncome = workRows.length ? totalIncome / workRows.length : 0;
  const revPerKm = totalDistance > 0 ? totalIncome / totalDistance : 0;
  const costPerKm = totalDistance > 0 ? totalOil / totalDistance : 0;
  const avgHourlyRate = totalHours > 0 ? totalProfit / totalHours : 0;

  // Last 30 days for column chart
  const sortedDesc = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const last30 = sortedDesc.slice(0, 30).reverse();
  const maxBarProfit = Math.max(...last30.map(r => profit(r)), 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-green-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                Grab Daily Driver Tracker
              </span>
              <span className="text-xs text-emerald-100">ขับขี่ปลอดภัย รวยๆ เฮงๆ 🛵💨</span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
              กำไรสุทธิรวม {fmt(totalProfit)} บาท
            </h2>
            <p className="mt-1 text-sm text-emerald-100">
              วิ่งงานแล้ว {workRows.length} วัน • เฉลี่ยกำไรวันละ {fmt(avgProfit)} บาท • ระยะทางรวม {fmtInt(totalDistance)} กม.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-md border border-white/20 text-center">
              <div className="text-xs font-medium text-emerald-100">ความคุ้มค่าเฉลี่ย</div>
              <div className="text-lg font-bold">{fmt(revPerKm)} ฿/กม.</div>
            </div>
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-md border border-white/20 text-center">
              <div className="text-xs font-medium text-emerald-100">กำไรเฉลี่ย/ชม.</div>
              <div className="text-lg font-bold">{fmt(avgHourlyRate)} ฿/ชม.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 11 KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* 1. Grab Income */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>รายได้ Grab รวม</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">💚 Grab</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{fmt(totalGrab)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท (ไม่รวมทิป)</div>
        </div>

        {/* 2. Tips */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Tip มือรวม</span>
            <span className="text-amber-500 font-bold">👋 ทิป</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{fmt(totalTip)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        {/* 3. Total Income */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>รายได้รวมทั้งสิ้น</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(totalIncome)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท (Grab + Tip)</div>
        </div>

        {/* 4. Distance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>ระยะทางวิ่งรวม</span>
            <Bike className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">{fmtInt(totalDistance)}</div>
          <div className="mt-1 text-xs text-slate-400">กม. • เฉลี่ย {fmt(revPerKm)} ฿/กม.</div>
        </div>

        {/* 5. Fuel Est & Real */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>ค่าน้ำมัน (ประมาณ)</span>
            <Fuel className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{fmt(totalOil)}</div>
          <div className="mt-1 text-xs text-slate-400">เติมจริง {fmt(totalOilReal)} บ. (~{fmt(costPerKm)} ฿/กม.)</div>
        </div>

        {/* 6. Net Profit */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span>กำไรสุทธิ</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">{fmt(totalProfit)}</div>
          <div className="mt-1 text-xs text-emerald-600/80">หักค่าน้ำมันประมาณการแล้ว</div>
        </div>

        {/* 7. Credit */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>เติมเครดิต Grab</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{fmt(totalCredit)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        {/* 8. Withdraw */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>ถอนเข้ากรุงศรี</span>
            <ArrowDownRight className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">{fmt(totalWithdraw)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท</div>
        </div>

        {/* 9. Hours */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>ชั่วโมงขับรวม</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalHours.toFixed(1)}</div>
          <div className="mt-1 text-xs text-slate-400">ชม. (เฉลี่ย {fmt(avgHourlyRate)} ฿/ชม.)</div>
        </div>

        {/* 10. Avg Income / Day */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>รายได้เฉลี่ย/วัน</span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{fmt(avgIncome)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท/วันทำงาน</div>
        </div>

        {/* 11. Avg Profit / Day */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>กำไรเฉลี่ย/วัน</span>
            <Award className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(avgProfit)}</div>
          <div className="mt-1 text-xs text-slate-400">บาท/วันทำงาน</div>
        </div>
      </div>

      {/* 30-Day Interactive Column Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊 กำไรสุทธิ 30 วันล่าสุด</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              แตะหรือเลื่อนเมาส์ไปที่แท่งกราฟเพื่อดูรายละเอียดรายวัน
            </p>
          </div>
          {selectedBar && (
            <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <strong>{fmtDateTh(selectedBar.date)}</strong>: กำไร <strong>{fmt(profit(selectedBar))} ฿</strong> (รายได้ {fmt(income(selectedBar))} บ. | น้ำมัน {fmt(selectedBar.oil)} บ. | วิ่ง {selectedBar.distance || 0} กม.)
            </div>
          )}
        </div>

        <div className="mt-6 flex h-48 items-end gap-1 sm:gap-2 overflow-x-auto pb-2">
          {last30.map((r) => {
            const p = profit(r);
            const heightPct = Math.max(4, Math.min(100, (p / maxBarProfit) * 100));
            const isWork = isWorkDay(r);
            const isSelected = selectedBar?.id === r.id;

            return (
              <div
                key={r.id}
                onMouseEnter={() => setSelectedBar(r)}
                onClick={() => setSelectedBar(r)}
                className="group relative flex flex-1 flex-col items-center justify-end h-full min-w-[20px] cursor-pointer"
              >
                {/* Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-md transition-all duration-200 ${
                    isSelected
                      ? 'bg-emerald-500 ring-2 ring-emerald-300'
                      : isWork
                      ? 'bg-emerald-600/80 hover:bg-emerald-500 group-hover:scale-y-105'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
                {/* Date label */}
                <span className="mt-2 text-[10px] text-slate-400">
                  {r.date.slice(8, 10)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
