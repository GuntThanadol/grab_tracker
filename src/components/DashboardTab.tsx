'use client';

import React from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay } from '@/lib/utils';
import { 
  TrendingUp, 
  Fuel, 
  Bike, 
  Coins, 
  Wallet, 
  ArrowDownLeft, 
  Clock, 
  ShieldCheck, 
  Gauge, 
  Flame,
  CreditCard,
  Percent
} from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

interface DashboardTabProps {
  entries: Entry[];
}

export default function DashboardTab({ entries }: DashboardTabProps) {
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
  const profitMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Primary Cockpit Command Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c131f] text-white p-5 sm:p-7 relative overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                <Bike className="w-3.5 h-3.5" />
                <span>ผลประกอบการสุทธิ (NET EARNINGS)</span>
              </span>
              <span className="text-xs text-slate-400 font-sans">
                วิ่งงานจริง {workRows.length} วัน (จากทั้งหมด {entries.length} วัน)
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono-num text-white">
                ฿{fmt(totalProfit)}
              </div>
              <div className="text-xs font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-mono">
                กำไรสุทธิ {profitMargin.toFixed(1)}%
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-sans">
              รายได้รวม Grab + ทิป <strong>฿{fmt(totalIncome)}</strong> หักค่าน้ำมันคำนวณตามระยะทาง <strong>฿{fmt(totalOil)}</strong>
            </p>
          </div>

          {/* Quick Telemetry Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-sans">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>กำไรเฉลี่ย/วัน</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono-num text-white">
                ฿{fmt(avgProfit)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-sans">
                <Gauge className="w-3 h-3 text-emerald-400" />
                <span>รายได้/กิโลเมตร</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono-num text-white">
                ฿{fmt(revPerKm)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1 font-sans">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>กำไรสุทธิ/ชม.</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono-num text-white">
                ฿{fmt(avgHourlyRate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Telemetry Blocks (Grouped Logic - Anti-AI Random Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Module 1: Revenue & Customer Tips */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                ฿
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  รายรับรอบขับ (Revenue)
                </h3>
                <p className="text-[11px] text-slate-400">ค่ารอบ Grab และสินน้ำใจจากลูกค้า</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">รายได้ Grab โดยตรง</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">฿{fmt(totalGrab)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">สินน้ำใจ/ทิปมือ</span>
              <span className="text-sm font-bold font-mono-num text-amber-600 dark:text-amber-400">฿{fmt(totalTip)}</span>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">รวมรายได้ทั้งหมด</span>
              <span className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">฿{fmt(totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Module 2: Fuel & Mileage Efficiency */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ค่าน้ำมันและระยะทาง (Efficiency)
                </h3>
                <p className="text-[11px] text-slate-400">ต้นทุนพลังงานจริงและตามสูตร</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">ระยะทางวิ่งสะสม</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">{fmtInt(totalDistance)} กม.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">ค่าน้ำมันตามไมล์</span>
              <span className="text-sm font-bold font-mono-num text-rose-600 dark:text-rose-400">฿{fmt(totalOil)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">จ่ายน้ำมันจริงที่ปั๊ม</span>
              <span className="font-mono-num text-slate-500 dark:text-slate-400">฿{fmt(totalOilReal)}</span>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">ต้นทุนน้ำมันเฉลี่ย</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">฿{costPerKm.toFixed(2)} /กม.</span>
            </div>
          </div>
        </div>

        {/* Module 3: Cash Flow & Time */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  กระเป๋าเงินและเวลา (Cash & Time)
                </h3>
                <p className="text-[11px] text-slate-400">เครดิต, ถอนเงิน และชั่วโมงวิ่ง</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">เติมเครดิตรับงาน</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">฿{fmt(totalCredit)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">ถอนเงินเข้าบัญชี</span>
              <span className="text-sm font-bold font-mono-num text-sky-600 dark:text-sky-400">฿{fmt(totalWithdraw)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">ชั่วโมงออนไลน์สะสม</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">{fmt(totalHours)} ชม.</span>
            </div>
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">เฉลี่ยเวลาต่อวัน</span>
              <span className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                {workRows.length > 0 ? (totalHours / workRows.length).toFixed(1) : 0} ชม./วัน
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Charts Component */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1722] p-4 sm:p-6">
        <AnalyticsCharts entries={entries} />
      </div>

    </div>
  );
}
