'use client';

import React, { useState } from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay, fmtDateTh, fmtDateSlash } from '@/lib/utils';
import { TrendingUp, Fuel, Bike, Wallet, ArrowDownRight, Clock, Award, DollarSign, CalendarCheck, Gauge, Zap, Activity } from 'lucide-react';

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

  // Tachometer gauge calculation (e.g. revPerKm target ~15 ฿/km max)
  const tachometerPct = Math.min(100, Math.max(10, (revPerKm / 12) * 100));
  // SVG arc calculation for 220 degree arc
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (220 / 360);
  const strokeDashoffset = arcLength - (arcLength * (tachometerPct / 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Superbike TFT Instrument Cockpit Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-[#041a0e] p-5 sm:p-7 text-white shadow-2xl border border-emerald-500/30 dark:border-emerald-500/40">
        {/* Dynamic Speed Streaks & Carbon Background */}
        <div className="absolute inset-0 bg-carbon-mesh opacity-30 pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-speed-glow pointer-events-none" />

        {/* Cockpit Top Telemetry Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-5 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono font-bold text-emerald-400 border border-emerald-500/40 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 led-beacon-green"></span>
              READY TO RIDE 🛵💨
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 font-mono text-slate-300">
              <Zap className="h-3 w-3 text-amber-400" /> SPORT+ MODE
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-slate-300">
            <span className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">ODO:</span>
              <strong className="text-white font-bold">{fmtInt(totalDistance)} KM</strong>
            </span>
            <span className="hidden xs:inline text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">TRIP:</span>
              <strong className="text-emerald-400 font-bold">{workRows.length} DAYS</strong>
            </span>
          </div>
        </div>

        {/* Main Cockpit Cluster: Speedometer + Tachometer Meter */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Digital Speedometer / Profit Metrics */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold tracking-wider uppercase">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>Digital Cockpit • Net Yield</span>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">กำไรสุทธิสะสมทั้งหมด (Total Net Profit)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,177,79,0.4)]">
                  {fmt(totalProfit)}
                </span>
                <span className="text-base sm:text-xl font-bold text-emerald-400 font-mono">THB</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              วิ่งงาน <span className="text-emerald-400 font-bold">{workRows.length}</span> วัน • เฉลี่ยกำไร <span className="text-emerald-400 font-bold">{fmt(avgProfit)}</span> บ./วัน • รายได้รวม <span className="text-white font-bold">{fmt(totalIncome)}</span> บ.
            </p>

            {/* Quick telemetry chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs border border-slate-700/80">
                <Fuel className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-slate-400 text-[11px]">ค่าน้ำมันเฉลี่ย:</span>
                <strong className="text-white font-mono">{fmt(costPerKm)} ฿/กม.</strong>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs border border-slate-700/80">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-slate-400 text-[11px]">ขับขี่รวม:</span>
                <strong className="text-white font-mono">{totalHours.toFixed(1)} ชม.</strong>
              </div>
            </div>
          </div>

          {/* Right: Interactive Tachometer & Speedometer Dial Gauge */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative flex flex-col items-center justify-center rounded-2xl bg-black/40 backdrop-blur-md p-4 sm:p-5 border border-white/10 shadow-inner w-full max-w-xs">
              {/* Shift Lights Bar */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-1.5 w-4 rounded-full bg-emerald-500 shadow-[0_0_6px_#00b14f]"></span>
                <span className="h-1.5 w-4 rounded-full bg-emerald-400 shadow-[0_0_6px_#00b14f]"></span>
                <span className="h-1.5 w-4 rounded-full bg-lime-400 shadow-[0_0_6px_#a3e635]"></span>
                <span className="h-1.5 w-4 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></span>
                <span className="h-1.5 w-4 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse"></span>
              </div>

              {/* Tachometer SVG Arc Gauge */}
              <div className="relative flex items-center justify-center h-32 w-32 sm:h-36 sm:w-36">
                <svg className="h-full w-full -rotate-[200deg]" viewBox="0 0 110 110">
                  {/* Gauge Background Track */}
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    strokeDasharray={arcLength}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Gauge Dynamic Glowing Progress Arc */}
                  <circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="transparent"
                    stroke="url(#tachometerGradient)"
                    strokeWidth="8"
                    strokeDasharray={arcLength}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="tachometerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00b14f" />
                      <stop offset="70%" stopColor="#10e068" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center Digital Speed Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">EFFICIENCY</span>
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_8px_rgba(0,177,79,0.8)]">
                    {fmt(revPerKm)}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">฿ / KM</span>
                </div>
              </div>

              {/* Bottom Gauge Stats */}
              <div className="mt-2 grid grid-cols-2 gap-3 w-full text-center border-t border-white/10 pt-2 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">HOURLY RATE</div>
                  <div className="font-bold text-white text-sm">{fmt(avgHourlyRate)} ฿/h</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">POWER LEVEL</div>
                  <div className="font-bold text-lime-400 text-sm">OPTIMAL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 11 KPI Cards Grid with Dimensional Cockpit Architecture */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* 1. Grab Income */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-emerald-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-emerald-600 dark:text-emerald-400">REV • GRAB</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 led-beacon-green"></span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">{fmt(totalGrab)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>รายได้ Grab</span>
            <span className="text-[11px] font-mono">฿ (ไม่รวมทิป)</span>
          </div>
        </div>

        {/* 2. Tips */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-amber-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-amber-500">BOOST • TIPS</span>
            <span className="h-2 w-2 rounded-full bg-amber-400 led-beacon-amber"></span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-500 dark:text-amber-400">{fmt(totalTip)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Tip มือรวม</span>
            <span className="text-[11px] font-mono">บาท</span>
          </div>
        </div>

        {/* 3. Total Income */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-emerald-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-emerald-600 dark:text-emerald-400">GROSS REVENUE</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{fmt(totalIncome)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>รายได้รวมทั้งสิ้น</span>
            <span className="text-[11px] font-mono">Grab+Tip</span>
          </div>
        </div>

        {/* 4. Distance */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-blue-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-blue-500 dark:text-blue-400">ODOMETER</span>
            <span className="h-2 w-2 rounded-full bg-blue-500 led-beacon-cyan"></span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{fmtInt(totalDistance)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>ระยะทางวิ่งรวม</span>
            <span className="text-[11px] font-mono">กม. (~{fmt(revPerKm)} ฿/กม.)</span>
          </div>
        </div>

        {/* 5. Fuel Est & Real */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-rose-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-rose-500">FUEL EXPENSE</span>
            <span className="h-2 w-2 rounded-full bg-rose-500 led-beacon-rose"></span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{fmt(totalOil)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>ค่าน้ำมัน (ประมาณ)</span>
            <span className="text-[11px] font-mono">จริง {fmt(totalOilReal)} บ.</span>
          </div>
        </div>

        {/* 6. Net Profit (Hero Card) */}
        <div className="cockpit-card rounded-2xl border border-emerald-400 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 dark:border-emerald-500/40 dark:bg-emerald-950/20 overflow-hidden ring-1 ring-emerald-500/20">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span className="font-mono text-[11px] tracking-wider font-bold">NET PAYLOAD (กำไร)</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300">{fmt(totalProfit)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-emerald-700/80 dark:text-emerald-400/80">
            <span>กำไรสุทธิ</span>
            <span className="text-[11px] font-mono">หักน้ำมันแล้ว</span>
          </div>
        </div>

        {/* 7. Credit */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-amber-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-slate-500 dark:text-slate-400">WALLET CREDIT</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">{fmt(totalCredit)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>เติมเครดิต Grab</span>
            <span className="text-[11px] font-mono">บาท</span>
          </div>
        </div>

        {/* 8. Withdraw */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-sky-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-sky-500">BANK TRANSFER</span>
            <ArrowDownRight className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-sky-600 dark:text-sky-400">{fmt(totalWithdraw)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>ถอนเข้ากรุงศรี</span>
            <span className="text-[11px] font-mono">บาท</span>
          </div>
        </div>

        {/* 9. Hours */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-indigo-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-indigo-500">ENGINE RUNTIME</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">{totalHours.toFixed(1)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>ชั่วโมงขับรวม</span>
            <span className="text-[11px] font-mono">เฉลี่ย {fmt(avgHourlyRate)} ฿/ชม.</span>
          </div>
        </div>

        {/* 10. Avg Income / Day */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-emerald-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-emerald-600 dark:text-emerald-400">DAILY PACE</span>
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">{fmt(avgIncome)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>รายได้เฉลี่ย/วัน</span>
            <span className="text-[11px] font-mono">บ./วันทำงาน</span>
          </div>
        </div>

        {/* 11. Avg Profit / Day */}
        <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-yellow-500/20 dark:bg-slate-900/90 overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px] tracking-wider text-yellow-600 dark:text-yellow-400">DAILY YIELD</span>
            <Award className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{fmt(avgProfit)}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>กำไรเฉลี่ย/วัน</span>
            <span className="text-[11px] font-mono">บ./วันทำงาน</span>
          </div>
        </div>
      </div>

      {/* 30-Day Dyno Telemetry Chart with High-Tech Beveled Frame */}
      <div className="cockpit-card rounded-2xl border border-slate-200/90 bg-white p-6 dark:border-emerald-500/20 dark:bg-[#0d121d]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 led-beacon-green"></span>
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>DYNO TELEMETRY • กำไรสุทธิ 30 วันล่าสุด</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              แตะหรือเลื่อนเมาส์ไปที่แท่งกราฟเพื่อดู Telemetry รายละเอียดรายวัน
            </p>
          </div>
          {selectedBar && (
            <div className="rounded-xl bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-900 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-sm animate-fade-in shadow-sm">
              <strong className="font-mono">{fmtDateSlash(selectedBar.date)}</strong> ({fmtDateTh(selectedBar.date)}): กำไร <strong>{fmt(profit(selectedBar))} ฿</strong> (รายได้ {fmt(income(selectedBar))} บ. | น้ำมัน {fmt(selectedBar.oil)} บ. | วิ่ง {selectedBar.distance || 0} กม.)
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
                  className={`w-full rounded-t-md transition-all duration-200 relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-t from-emerald-600 to-lime-400 ring-2 ring-emerald-300 dark:ring-emerald-400 shadow-lg shadow-emerald-500/40'
                      : isWork
                      ? 'bg-gradient-to-t from-emerald-700/80 via-emerald-600/80 to-emerald-400/90 hover:from-emerald-600 hover:to-lime-400 group-hover:scale-y-105'
                      : 'bg-slate-200 dark:bg-slate-800/80'
                  }`}
                >
                  {isWork && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/70" />
                  )}
                </div>
                {/* Date label */}
                <span className={`mt-2 text-[10px] font-mono transition-colors ${isSelected ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
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
