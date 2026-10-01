'use client';

import React, { useState, useMemo } from 'react';
import { Entry } from '@/types';
import { fmt, fmtInt, income, profit, isWorkDay, fmtDateTh, fmtDateSlash, TH_DOWS, TH_DOWS_S } from '@/lib/utils';
import { TrendingUp, BarChart3, Calendar, Zap, Fuel, Bike, Clock, Award, Layers, HelpCircle, Check, Info, X } from 'lucide-react';

interface AnalyticsChartsProps {
  entries: Entry[];
}

type ChartMode = 'trend' | 'breakdown' | 'dow' | 'efficiency';
type TimeRange = '7' | '14' | '30' | '60' | 'all';

export default function AnalyticsCharts({ entries }: AnalyticsChartsProps) {
  const [mode, setMode] = useState<ChartMode>('trend');
  const [timeRange, setTimeRange] = useState<TimeRange>('30');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const handleModeChange = (newMode: ChartMode) => {
    setMode(newMode);
    setSelectedEntry(null);
  };

  // Series visibility toggles for Trend mode
  const [showProfit, setShowProfit] = useState(true);
  const [showIncome, setShowIncome] = useState(true);
  const [showOil, setShowOil] = useState(true);

  // Filter entries by selected time range
  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    let sliced = sorted;
    if (timeRange === '7') sliced = sorted.slice(0, 7);
    else if (timeRange === '14') sliced = sorted.slice(0, 14);
    else if (timeRange === '30') sliced = sorted.slice(0, 30);
    else if (timeRange === '60') sliced = sorted.slice(0, 60);
    return sliced.reverse(); // oldest to newest for left-to-right chart
  }, [entries, timeRange]);

  // Compute maximum values for scaling
  const maxValues = useMemo(() => {
    let maxInc = 100;
    let maxProf = 100;
    let maxO = 50;
    let maxTotal = 100;
    let maxEffHourly = 50;
    let maxEffKm = 10;

    filteredEntries.forEach((r) => {
      const inc = income(r);
      const prof = profit(r);
      const o = Number(r.oil) || 0;
      const d = Number(r.distance) || 0;
      const h = Number(r.hours) || 0;

      if (inc > maxInc) maxInc = inc;
      if (prof > maxProf) maxProf = prof;
      if (o > maxO) maxO = o;
      if (inc > maxTotal) maxTotal = inc;

      const hourly = h > 0 ? prof / h : 0;
      const perKm = d > 0 ? inc / d : 0;
      if (hourly > maxEffHourly) maxEffHourly = hourly;
      if (perKm > maxEffKm) maxEffKm = perKm;
    });

    return {
      revenueMax: Math.max(maxInc, maxProf, maxO, 100),
      stackedMax: Math.max(maxTotal, 100),
      hourlyMax: Math.max(maxEffHourly, 100),
      perKmMax: Math.max(maxEffKm, 15),
    };
  }, [filteredEntries]);

  // Day-of-Week Aggregations for Mode 3
  const dowStats = useMemo(() => {
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // We want Monday (1) to Sunday (0) ordering
    const dowOrder = [1, 2, 3, 4, 5, 6, 0];
    const groups: {
      [key: number]: {
        dow: number;
        name: string;
        shortName: string;
        count: number;
        workDays: number;
        totalProfit: number;
        totalIncome: number;
        totalOil: number;
        totalDistance: number;
        totalHours: number;
      };
    } = {};

    dowOrder.forEach((d) => {
      groups[d] = {
        dow: d,
        name: TH_DOWS[d],
        shortName: TH_DOWS_S[d],
        count: 0,
        workDays: 0,
        totalProfit: 0,
        totalIncome: 0,
        totalOil: 0,
        totalDistance: 0,
        totalHours: 0,
      };
    });

    entries.forEach((r) => {
      if (!r.date) return;
      const [y, m, d] = r.date.slice(0, 10).split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dow = dt.getDay();
      const g = groups[dow];
      if (!g) return;

      g.count += 1;
      const w = isWorkDay(r);
      if (w) {
        g.workDays += 1;
        g.totalProfit += profit(r);
        g.totalIncome += income(r);
        g.totalOil += Number(r.oil) || 0;
        g.totalDistance += Number(r.distance) || 0;
        g.totalHours += Number(r.hours) || 0;
      }
    });

    const result = dowOrder.map((d) => {
      const g = groups[d];
      const avgProf = g.workDays > 0 ? g.totalProfit / g.workDays : 0;
      const avgInc = g.workDays > 0 ? g.totalIncome / g.workDays : 0;
      const avgHourly = g.totalHours > 0 ? g.totalProfit / g.totalHours : 0;
      const avgPerKm = g.totalDistance > 0 ? g.totalIncome / g.totalDistance : 0;

      return {
        ...g,
        avgProfit: avgProf,
        avgIncome: avgInc,
        avgHourly,
        avgPerKm,
      };
    });

    const maxDowProfit = Math.max(...result.map((r) => r.avgProfit), 100);
    const bestDow = [...result].sort((a, b) => b.avgProfit - a.avgProfit)[0];

    return {
      items: result,
      maxDowProfit,
      bestDow,
    };
  }, [entries]);

  // Overall benchmarks
  const benchmark = useMemo(() => {
    const work = filteredEntries.filter(isWorkDay);
    const sumProfit = work.reduce((s, r) => s + profit(r), 0);
    const sumDistance = work.reduce((s, r) => s + (Number(r.distance) || 0), 0);
    const sumHours = work.reduce((s, r) => s + (Number(r.hours) || 0), 0);
    const sumIncome = work.reduce((s, r) => s + income(r), 0);

    return {
      avgProfit: work.length ? sumProfit / work.length : 0,
      avgHourly: sumHours > 0 ? sumProfit / sumHours : 0,
      avgPerKm: sumDistance > 0 ? sumIncome / sumDistance : 0,
    };
  }, [filteredEntries]);

  // Dimensions for SVG Charts
  const svgWidth = 800;
  const svgHeight = 240;
  const padding = { top: 25, right: 25, bottom: 35, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Coordinate helper for line/area chart
  const getX = (idx: number, count: number) => {
    if (count <= 1) return padding.left + chartW / 2;
    return padding.left + (idx / (count - 1)) * chartW;
  };

  const getY = (val: number, max: number) => {
    const safeMax = max > 0 ? max : 1;
    const clamped = Math.max(0, val);
    return padding.top + chartH - (clamped / safeMax) * chartH;
  };

  // Build SVG path strings
  const count = filteredEntries.length;
  const profitYMax = Math.ceil((maxValues.revenueMax * 1.15) / 100) * 100;

  const pointsProfit = filteredEntries.map((r, i) => ({
    x: getX(i, count),
    y: getY(profit(r), profitYMax),
    entry: r,
  }));

  const pointsIncome = filteredEntries.map((r, i) => ({
    x: getX(i, count),
    y: getY(income(r), profitYMax),
    entry: r,
  }));

  const pointsOil = filteredEntries.map((r, i) => ({
    x: getX(i, count),
    y: getY(Number(r.oil) || 0, profitYMax),
    entry: r,
  }));

  // Create smooth curved SVG path
  const makePath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePathProfit = makePath(pointsProfit);
  const linePathIncome = makePath(pointsIncome);
  const linePathOil = makePath(pointsOil);

  const areaPathProfit = pointsProfit.length > 1
    ? `${linePathProfit} L ${pointsProfit[pointsProfit.length - 1].x} ${padding.top + chartH} L ${pointsProfit[0].x} ${padding.top + chartH} Z`
    : '';

  // Mode 4: Efficiency points
  const effPoints = filteredEntries.map((r, i) => {
    const h = Number(r.hours) || 0;
    const d = Number(r.distance) || 0;
    const hourly = h > 0 ? profit(r) / h : 0;
    const perKm = d > 0 ? income(r) / d : 0;
    return {
      x: getX(i, count),
      yHourly: getY(hourly, maxValues.hourlyMax * 1.15),
      yPerKm: getY(perKm, maxValues.perKmMax * 1.15),
      hourly,
      perKm,
      entry: r,
    };
  });

  const effHourlyPath = makePath(effPoints.map(p => ({ x: p.x, y: p.yHourly })));
  const effKmPath = makePath(effPoints.map(p => ({ x: p.x, y: p.yPerKm })));

  return (
    <div className="space-y-4">
      {/* Analytics Card Frame */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
        
        {/* Top Header: Title, Mode Tabs, and Range Selector */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                ศูนย์วิเคราะห์ผลประกอบการเชิงลึก
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              สลับดูแนวโน้มรายได้, สัดส่วนต้นทุนน้ำมัน, อัตราความคุ้มค่า และวันที่วิ่งคุ้มสุดในสัปดาห์
            </p>
          </div>

          {/* Time Range Selector (shown for trend, breakdown, efficiency) */}
          {mode !== 'dow' ? (
            <div className="flex items-center gap-1.5 self-start lg:self-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/80">
              {[
                { id: '7', label: '7 วัน' },
                { id: '14', label: '14 วัน' },
                { id: '30', label: '30 วัน' },
                { id: '60', label: '60 วัน' },
                { id: 'all', label: 'ทั้งหมด' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTimeRange(t.id as TimeRange);
                    setSelectedEntry(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                    timeRange === t.id
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 self-start lg:self-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/80 text-xs text-slate-500 font-medium">
              <span>🗓️ สถิติสะสมทั้งหมด</span>
            </div>
          )}
        </div>

        {/* Chart Mode Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          {[
            { id: 'trend', label: '📈 แนวโน้มเปรียบเทียบ (Trend)', icon: TrendingUp },
            { id: 'breakdown', label: '📊 โครงสร้างรายได้ vs น้ำมัน', icon: Layers },
            { id: 'dow', label: '🗓️ วันไหนวิ่งคุ้มสุด (จ.-อา.)', icon: Calendar },
            { id: 'efficiency', label: '⚡ ความคุ้มค่า (฿/ชม. & ฿/กม.)', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleModeChange(tab.id as ChartMode)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 dark:bg-emerald-500 dark:text-slate-950 font-bold'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mode 1 Controls: Series Toggles */}
        {mode === 'trend' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 text-xs">
            <span className="text-slate-400 text-[11px]">เลือกชุดข้อมูล:</span>
            <button
              onClick={() => setShowProfit(!showProfit)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
                showProfit
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 line-through'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>กำไรสุทธิ</span>
            </button>

            <button
              onClick={() => setShowIncome(!showIncome)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
                showIncome
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 line-through'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>รายได้รวม</span>
            </button>

            <button
              onClick={() => setShowOil(!showOil)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition border ${
                showOil
                  ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 line-through'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>ค่าน้ำมัน</span>
            </button>
          </div>
        )}

        {/* Selected Data Point Banner / Tooltip */}
        {selectedEntry && mode !== 'dow' && (
          <div className="mt-4 relative rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-xs text-slate-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-slate-200 animate-fade-in">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-emerald-200/50 dark:hover:text-slate-200 dark:hover:bg-emerald-900/50 transition"
              title="ปิดรายละเอียด"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2 pr-7">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <span>📅 {fmtDateSlash(selectedEntry.date)} ({fmtDateTh(selectedEntry.date)})</span>
                {!isWorkDay(selectedEntry) && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    วันหยุด
                  </span>
                )}
              </div>
              <div className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                กำไรสุทธิ: {fmt(profit(selectedEntry))} ฿
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">รายได้ Grab + Tip:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{fmt(income(selectedEntry))} ฿</strong>
                <span className="text-slate-400 block text-[10px]">(Grab {fmt(selectedEntry.grab)} | Tip {fmt(selectedEntry.tip)})</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">ค่าน้ำมัน (ประมาณ/จริง):</span>
                <strong className="text-rose-600 dark:text-rose-400 font-mono">{fmt(selectedEntry.oil)} ฿</strong>
                <span className="text-slate-400 block text-[10px]">(เติมจริง {fmt(selectedEntry.oil_real)} ฿)</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">ระยะทาง & ชม.ขับ:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-mono">
                  {selectedEntry.distance ? `${selectedEntry.distance} กม.` : '—'} • {selectedEntry.hours ? `${selectedEntry.hours} ชม.` : '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">อัตราเฉลี่ย:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedEntry.hours ? `${(profit(selectedEntry) / selectedEntry.hours).toFixed(1)} ฿/ชม.` : '—'}
                  {' '}|{' '}
                  {selectedEntry.distance ? `${(income(selectedEntry) / selectedEntry.distance).toFixed(2)} ฿/กม.` : '—'}
                </strong>
              </div>
            </div>
            {selectedEntry.note && (
              <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 border-t border-emerald-200/40 dark:border-emerald-800/40 pt-1">
                📝 หมายเหตุ: {selectedEntry.note}
              </div>
            )}
          </div>
        )}

        {/* MAIN CHART CONTAINER */}
        <div className="mt-4">
          
          {/* MODE 1: Multi-Metric Area & Line Trend */}
          {mode === 'trend' && (
            <div className="relative overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full min-w-[650px] h-60 sm:h-72 select-none"
              >
                <defs>
                  <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines & Y Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padding.top + chartH * (1 - ratio);
                  const val = profitYMax * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + chartW}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-mono font-medium"
                      >
                        {fmtInt(val)} ฿
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill for Profit */}
                {showProfit && areaPathProfit && (
                  <path d={areaPathProfit} fill="url(#profitAreaGrad)" />
                )}

                {/* Line: Income */}
                {showIncome && linePathIncome && (
                  <path
                    d={linePathIncome}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Line: Oil Expense */}
                {showOil && linePathOil && (
                  <path
                    d={linePathOil}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Line: Net Profit */}
                {showProfit && linePathProfit && (
                  <path
                    d={linePathProfit}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points & X-Axis Dates */}
                {filteredEntries.map((r, i) => {
                  const pt = pointsProfit[i];
                  const isSelected = selectedEntry?.id === r.id;
                  const isW = isWorkDay(r);

                  // Show every nth date label to avoid clutter
                  const step = count > 30 ? 5 : count > 14 ? 3 : 1;
                  const showLabel = i % step === 0 || i === count - 1;

                  return (
                    <g key={r.id}>
                      {/* Vertical Hover trigger bar */}
                      <rect
                        x={pt.x - chartW / (count * 2)}
                        y={padding.top}
                        width={chartW / count}
                        height={chartH}
                        fill="transparent"
                        className="cursor-pointer hover:fill-emerald-500/10"
                        onMouseEnter={() => setSelectedEntry(r)}
                        onClick={() => setSelectedEntry(r)}
                      />

                      {/* Dot for Profit */}
                      {showProfit && isW && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 6 : 3.5}
                          fill={isSelected ? '#059669' : '#10b981'}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="pointer-events-none transition-all duration-150"
                        />
                      )}

                      {/* X Axis Date Label */}
                      {showLabel && (
                        <text
                          x={pt.x}
                          y={padding.top + chartH + 18}
                          textAnchor="middle"
                          className={`text-[10px] font-mono select-none ${
                            isSelected ? 'fill-emerald-600 dark:fill-emerald-400 font-bold' : 'fill-slate-400'
                          }`}
                        >
                          {r.date.slice(8, 10)}/{r.date.slice(5, 7)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* MODE 2: Stacked Revenue & Fuel Breakdown */}
          {mode === 'breakdown' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>แตะแท่งกราฟเพื่อดูสัดส่วน: เขียว = กำไรสุทธิ | แดง = ค่าน้ำมัน</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-emerald-500" /> กำไรสุทธิ
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-sm bg-rose-500" /> ค่าน้ำมัน
                  </span>
                </div>
              </div>

              <div className="flex h-56 items-end gap-1 sm:gap-2 overflow-x-auto pb-2 pt-4">
                {filteredEntries.map((r) => {
                  const inc = income(r);
                  const o = Number(r.oil) || 0;
                  const p = profit(r);
                  const isW = isWorkDay(r);
                  const isSelected = selectedEntry?.id === r.id;

                  const totalHeightPct = Math.max(5, Math.min(100, (inc / maxValues.stackedMax) * 100));
                  const profitRatio = inc > 0 ? Math.max(0, p / inc) : 0;
                  const profitMarginPct = inc > 0 ? ((p / inc) * 100).toFixed(0) : '0';

                  return (
                    <div
                      key={r.id}
                      onMouseEnter={() => setSelectedEntry(r)}
                      onClick={() => setSelectedEntry(r)}
                      className="group relative flex flex-1 flex-col items-center justify-end h-full min-w-[22px] cursor-pointer"
                    >
                      {/* Stacked Bar Container */}
                      <div
                        style={{ height: isW ? `${totalHeightPct}%` : '6%' }}
                        className={`w-full rounded-t-md overflow-hidden flex flex-col justify-end transition-all ${
                          isSelected ? 'ring-2 ring-emerald-400 shadow-md' : 'group-hover:opacity-90'
                        } ${!isW ? 'bg-slate-200 dark:bg-slate-800' : ''}`}
                      >
                        {isW && (
                          <>
                            {/* Oil expense slice (Top) */}
                            <div
                              style={{ height: `${(1 - profitRatio) * 100}%` }}
                              className="w-full bg-rose-500/90 transition-all"
                              title={`น้ำมัน ${fmt(o)} ฿`}
                            />
                            {/* Net Profit slice (Bottom) */}
                            <div
                              style={{ height: `${profitRatio * 100}%` }}
                              className="w-full bg-emerald-500 transition-all"
                              title={`กำไร ${fmt(p)} ฿ (${profitMarginPct}%)`}
                            />
                          </>
                        )}
                      </div>

                      {/* Margin badge on hover */}
                      {isW && (
                        <span className="hidden sm:group-hover:block absolute -top-5 text-[9px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1 rounded shadow pointer-events-none z-10">
                          {profitMarginPct}%
                        </span>
                      )}

                      {/* Date label */}
                      <span className={`mt-2 text-[10px] font-mono ${isSelected ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {r.date.slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 3: Day-of-Week Performance & Best Day Analysis */}
          {mode === 'dow' && (
            <div className="space-y-5">
              {/* Strategic Insights Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                    <span>👑 วันทองคำทำเงินสูงสุด</span>
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-1 text-lg font-black text-amber-900 dark:text-amber-200">
                    วัน{dowStats.bestDow.name}
                  </div>
                  <div className="text-xs text-amber-700/80 dark:text-amber-400 mt-0.5">
                    กำไรเฉลี่ย <strong>{fmt(dowStats.bestDow.avgProfit)} ฿</strong> / วันทำงาน
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span>⚡ ความคุ้มค่าต่อเวลาเฉลี่ย</span>
                    <Zap className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-1 text-lg font-black text-emerald-900 dark:text-emerald-200">
                    {fmt(dowStats.bestDow.avgHourly)} ฿ / ชม.
                  </div>
                  <div className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                    (วัน{dowStats.bestDow.name} ได้เรทชั่วโมงสูงสุด)
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                    <span>🛵 วิ่งคุ้มค่าน้ำมันเฉลี่ย</span>
                    <Bike className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-1 text-lg font-black text-blue-900 dark:text-blue-200">
                    {fmt(dowStats.bestDow.avgPerKm)} ฿ / กม.
                  </div>
                  <div className="text-xs text-blue-700/80 dark:text-blue-400 mt-0.5">
                    รายได้เฉลี่ยต่อระยะทางวิ่ง
                  </div>
                </div>
              </div>

              {/* Day-of-Week Horizontal Comparison Bars */}
              <div className="space-y-3 pt-1">
                {dowStats.items.map((item) => {
                  const pct = Math.max(8, Math.min(100, (item.avgProfit / dowStats.maxDowProfit) * 100));
                  const isBest = item.dow === dowStats.bestDow.dow;

                  return (
                    <div key={item.dow} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          {isBest && <span>🏆</span>}
                          <span>วัน{item.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            (วิ่ง {item.workDays} วัน จากทั้งหมด {item.count} วัน)
                          </span>
                        </span>
                        <div className="flex items-center gap-3 font-mono text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            เฉลี่ย {fmt(item.avgHourly)} ฿/ชม.
                          </span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {fmt(item.avgProfit)} ฿/วัน
                          </strong>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            isBest
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                              : 'bg-emerald-600 dark:bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>💡 กลยุทธ์การวิ่งงาน:</strong> ข้อมูลคำนวณจากประวัติการขับจริงทั้งหมด หากต้องการเพิ่มผลตอบแทนสูงสุด ให้เน้นวิ่งในวันที่มีกำไรเฉลี่ยต่อชั่วโมงสูง และจัดสรรวันพักผ่อนในวันที่มีค่าเฉลี่ยต่ำ
                </p>
              </div>
            </div>
          )}

          {/* MODE 4: Efficiency Rates (฿/ชม. และ ฿/กม.) */}
          {mode === 'efficiency' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> กำไรต่อชั่วโมง (฿/ชม.)
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> รายได้ต่อกิโลเมตร (฿/กม.)
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  Benchmark เฉลี่ย: {fmt(benchmark.avgHourly)} ฿/ชม. | {fmt(benchmark.avgPerKm)} ฿/กม.
                </div>
              </div>

              <div className="relative overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] h-60 sm:h-72 select-none"
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + chartH * (1 - ratio);
                    const valHourly = maxValues.hourlyMax * ratio;
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + chartW}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="1"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] fill-indigo-500 font-mono font-medium"
                        >
                          {fmtInt(valHourly)} ฿/h
                        </text>
                      </g>
                    );
                  })}

                  {/* Line: Hourly Rate */}
                  {effHourlyPath && (
                    <path
                      d={effHourlyPath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Line: Per Km Rate */}
                  {effKmPath && (
                    <path
                      d={effKmPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Points & Labels */}
                  {effPoints.map((pt, i) => {
                    const isSelected = selectedEntry?.id === pt.entry.id;
                    const isW = isWorkDay(pt.entry);
                    const step = count > 30 ? 5 : count > 14 ? 3 : 1;
                    const showLabel = i % step === 0 || i === count - 1;

                    return (
                      <g key={pt.entry.id}>
                        <rect
                          x={pt.x - chartW / (count * 2)}
                          y={padding.top}
                          width={chartW / count}
                          height={chartH}
                          fill="transparent"
                          className="cursor-pointer hover:fill-indigo-500/10"
                          onMouseEnter={() => setSelectedEntry(pt.entry)}
                          onClick={() => setSelectedEntry(pt.entry)}
                        />

                        {isW && pt.hourly > 0 && (
                          <circle
                            cx={pt.x}
                            cy={pt.yHourly}
                            r={isSelected ? 5.5 : 3.5}
                            fill="#6366f1"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        )}

                        {showLabel && (
                          <text
                            x={pt.x}
                            y={padding.top + chartH + 18}
                            textAnchor="middle"
                            className={`text-[10px] font-mono select-none ${
                              isSelected ? 'fill-indigo-600 dark:fill-indigo-400 font-bold' : 'fill-slate-400'
                            }`}
                          >
                            {pt.entry.date.slice(8, 10)}/{pt.entry.date.slice(5, 7)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
