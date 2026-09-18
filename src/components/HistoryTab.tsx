'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Entry, FuelSettings, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { fmt, fmtDateSlash, fmtDateTh, isWorkDay, income, profit, TH_MONTHS } from '@/lib/utils';
import { Search, Filter, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Check, ArrowUpDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import ThaiDatePicker from './ThaiDatePicker';

interface HistoryTabProps {
  entries: Entry[];
  fuelSettings: FuelSettings;
  onRefresh: () => void;
  userRole?: UserRole | null;
}

export default function HistoryTab({ entries, fuelSettings, onRefresh, userRole }: HistoryTabProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'work' | 'rest'>('all');
  
  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Import Excel state
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<Entry[] | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  // Prevent background scroll while any modal is open
  useEffect(() => {
    if (editingEntry || pendingImport || deleteConfirmId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingEntry, pendingImport, deleteConfirmId]);

  // Available months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(r => {
      if (r.date) set.add(r.date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Filtered rows
  const filteredEntries = useMemo(() => {
    let list = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    if (selectedMonth !== 'all') {
      list = list.filter(r => r.date.startsWith(selectedMonth));
    }

    if (typeFilter === 'work') {
      list = list.filter(isWorkDay);
    } else if (typeFilter === 'rest') {
      list = list.filter(r => !isWorkDay(r));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.date.includes(q) || (r.note && r.note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [entries, selectedMonth, typeFilter, searchTerm]);

  // Export Excel
  const handleExportExcel = () => {
    const wsData = [
      ['วันที่', 'รายได้ Grab (บาท)', 'Tip มือ (บาท)', 'รายได้รวม (บาท)', 'ระยะทาง (กม.)', 'ค่าน้ำมัน (บาท)', 'เติมน้ำมันจริง (บาท)', 'เครดิต Grab (บาท)', 'ถอนเข้ากรุงศรี (บาท)', 'ชั่วโมงขับ', 'กำไรสุทธิ (บาท)', 'หมายเหตุ'],
      ...filteredEntries.map(r => [
        r.date,
        Number(r.grab) || 0,
        Number(r.tip) || 0,
        income(r),
        Number(r.distance) || '',
        Number(r.oil) || 0,
        Number(r.oil_real) || 0,
        Number(r.credit) || 0,
        Number(r.withdraw) || 0,
        Number(r.hours) || '',
        profit(r),
        r.note || ''
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'บัญชีรายวัน');
    XLSX.writeFile(wb, `Grab_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Delete Action
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('entries').delete().eq('id', id);
      if (error) throw error;
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      alert(`ลบไม่สำเร็จ: ${err.message}`);
    }
  };

  // Save Edit Action
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setEditLoading(true);
    try {
      const { error } = await supabase.from('entries').update({
        date: editingEntry.date,
        grab: Number(editingEntry.grab) || 0,
        tip: Number(editingEntry.tip) || 0,
        distance: editingEntry.distance ? Number(editingEntry.distance) : null,
        oil: Number(editingEntry.oil) || 0,
        oil_real: Number(editingEntry.oil_real) || 0,
        credit: Number(editingEntry.credit) || 0,
        withdraw: Number(editingEntry.withdraw) || 0,
        hours: editingEntry.hours ? Number(editingEntry.hours) : null,
        note: editingEntry.note || '',
        updated_at: new Date().toISOString()
      }).eq('id', editingEntry.id);

      if (error) throw error;
      setEditingEntry(null);
      onRefresh();
    } catch (err: any) {
      alert(`แก้ไขไม่สำเร็จ: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Excel File Selection
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'array', cellDates: false });

        const isDateSerial = (v: any) => typeof v === 'number' && v > 30000 && v < 70000;
        const isDateString = (v: any) => typeof v === 'string' && (/\d{4}-\d{2}-\d{2}/.test(v) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(v));
        const isDateCell = (v: any) => isDateSerial(v) || isDateString(v);

        let rawRows: any[][] | null = null;
        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null }) as any[][];
          if (rows.some((r) => r && isDateCell(r[0]))) {
            rawRows = rows;
            break;
          }
        }

        if (!rawRows) {
          alert('ไม่พบข้อมูลวันที่ในไฟล์ Excel');
          return;
        }

        const firstDataRowIdx = rawRows.findIndex((r) => r && isDateCell(r[0]));
        if (firstDataRowIdx < 0) {
          alert('ไม่พบแถวข้อมูลในไฟล์');
          return;
        }

        const headerRow = firstDataRowIdx > 0 ? rawRows[firstDataRowIdx - 1] : [];
        const headers = (headerRow || []).map((h) => (h ? String(h).toLowerCase() : ''));

        const colOf = (kws: string[]) => {
          for (const kw of kws) {
            const i = headers.findIndex((h) => h.includes(kw.toLowerCase()));
            if (i >= 0) return i;
          }
          return -1;
        };

        const cGrab = colOf(['grab', 'แกร็บ']) >= 0 ? colOf(['grab', 'แกร็บ']) : 1;
        const cTip = colOf(['tip', 'ทิป']) >= 0 ? colOf(['tip', 'ทิป']) : 2;
        const cDist = colOf(['ระยะทาง', 'distance', 'กม']);
        const cOil = colOf(['ค่าน้ำมัน', 'ประมาณการ']) >= 0 ? colOf(['ค่าน้ำมัน', 'ประมาณการ']) : 4;
        const cOilReal = colOf(['เติมจริง', 'เติมน้ำมันจริง']) >= 0 ? colOf(['เติมจริง', 'เติมน้ำมันจริง']) : 5;
        const cCredit = colOf(['เครดิต', 'credit']) >= 0 ? colOf(['เครดิต', 'credit']) : 6;
        const cWithdraw = colOf(['ถอน', 'withdraw']) >= 0 ? colOf(['ถอน', 'withdraw']) : 7;
        const cHours = colOf(['ชั่วโมง', 'ชม', 'hours']);
        const cNote = colOf(['หมายเหตุ', 'note']) >= 0 ? colOf(['หมายเหตุ', 'note']) : 9;

        const parseExcelDate = (val: any): string | null => {
          if (val == null) return null;
          if (typeof val === 'number' && val > 30000 && val < 70000) {
            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          }
          const str = String(val).trim();
          const mIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (mIso) {
            let y = parseInt(mIso[1], 10);
            if (y > 2500) y -= 543;
            return `${y}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
          }
          const mSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (mSlash) {
            let y = parseInt(mSlash[3], 10);
            if (y > 2500) y -= 543;
            return `${y}-${mSlash[2].padStart(2, '0')}-${mSlash[1].padStart(2, '0')}`;
          }
          if (str.includes('T')) {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
              d.setHours(d.getHours() + 7);
              return d.toISOString().slice(0, 10);
            }
          }
          return null;
        };

        const parsed: Entry[] = [];
        for (let i = firstDataRowIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row) continue;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) continue;

          let dist = cDist >= 0 && row[cDist] != null ? parseFloat(row[cDist]) || null : null;
          const oil = cOil >= 0 && row[cOil] != null ? parseFloat(row[cOil]) || 0 : 0;
          if (!dist && oil > 0) {
            const rate = fuelSettings.rate_km_per_l || 71.4;
            const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
            dist = parseFloat(((oil / price) * rate).toFixed(1));
          }

          const grabVal = cGrab >= 0 && row[cGrab] != null ? parseFloat(row[cGrab]) || 0 : 0;
          const tipVal = cTip >= 0 && row[cTip] != null ? parseFloat(row[cTip]) || 0 : 0;
          let hoursVal = cHours >= 0 && row[cHours] != null ? parseFloat(row[cHours]) || null : null;
          const isWork = grabVal > 0 || tipVal > 0 || (dist != null && dist > 0) || oil > 0;
          if (isWork && (hoursVal === null || hoursVal === 0)) {
            hoursVal = 3;
          }

          parsed.push({
            id: `entry_${dateStr}_${Math.random().toString(36).slice(2, 6)}`,
            date: dateStr,
            grab: grabVal,
            tip: tipVal,
            distance: dist,
            oil: oil,
            oil_real: cOilReal >= 0 && row[cOilReal] != null ? parseFloat(row[cOilReal]) || 0 : 0,
            credit: cCredit >= 0 && row[cCredit] != null ? parseFloat(row[cCredit]) || 0 : 0,
            withdraw: cWithdraw >= 0 && row[cWithdraw] != null ? parseFloat(row[cWithdraw]) || 0 : 0,
            hours: hoursVal,
            note: cNote >= 0 && row[cNote] != null ? String(row[cNote]).trim() : '',
          });
        }

        if (parsed.length === 0) {
          alert('ไม่พบข้อมูลที่สามารถนำเข้าได้');
          return;
        }

        setPendingImport(parsed);
      } catch (err: any) {
        alert(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!pendingImport || pendingImport.length === 0) return;
    setIsImporting(true);
    setImportStatusMsg(`กำลังนำเข้าข้อมูล ${pendingImport.length} วันลง Supabase...`);

    try {
      const chunkSize = 50;
      for (let i = 0; i < pendingImport.length; i += chunkSize) {
        const chunk = pendingImport.slice(i, i + chunkSize);
        const { error } = await supabase.from('entries').upsert(chunk, { onConflict: 'date' });
        if (error) throw error;
      }

      const count = pendingImport.length;
      setPendingImport(null);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      alert(`✅ นำเข้าข้อมูลสำเร็จทั้งหมด ${count} รายการ!`);
      onRefresh();
    } catch (err: any) {
      alert(`นำเข้าไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportStatusMsg(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาวันที่ เช่น 2026-09 หรือหมายเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-base sm:text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">📅 ทุกเดือน ({entries.length} วัน)</option>
              {availableMonths.map((m) => {
                const [y, mo] = m.split('-');
                const thYear = parseInt(y, 10) + 543;
                const thMonthName = TH_MONTHS[parseInt(mo, 10) - 1] || m;
                return (
                  <option key={m} value={m}>
                    {thMonthName} {thYear}
                  </option>
                );
              })}
            </select>

            {/* Type Filter */}
            <div className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'work', label: 'วิ่งงาน' },
                { id: 'rest', label: 'หยุด' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTypeFilter(btn.id as any)}
                  className={`rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition ${
                    typeFilter === btn.id
                      ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions: Import & Export Excel */}
        <div className="flex items-center gap-2 shrink-0">
          {userRole !== 'guest' && (
            <label
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer active:scale-95 touch-manipulation"
              title="นำเข้าไฟล์ Excel (.xlsx, .xls, .csv)"
            >
              <span className="text-base">📥</span>
              <span>Import</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          )}

          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition shadow-sm active:scale-95 touch-manipulation"
          >
            <span className="text-base">📤</span>
            <span>Export ({filteredEntries.length})</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 px-3.5 py-3 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#334155]">วันที่</th>
                <th className="px-3 py-3 text-right">Grab (฿)</th>
                <th className="px-3 py-3 text-right">Tip (฿)</th>
                <th className="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">รวม (฿)</th>
                <th className="px-3 py-3 text-right">ระยะทาง (กม.)</th>
                <th className="px-3 py-3 text-right text-rose-500">น้ำมัน (฿)</th>
                <th className="px-3 py-3 text-right">เติมจริง (฿)</th>
                <th className="px-3 py-3 text-right">เครดิต (฿)</th>
                <th className="px-3 py-3 text-right">ถอน (฿)</th>
                <th className="px-3 py-3 text-right">ชม.</th>
                <th className="px-3 py-3 text-right font-black">กำไรสุทธิ</th>
                <th className="px-3 py-3">หมายเหตุ</th>
                {userRole !== 'guest' && <th className="px-3 py-3 text-center">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'guest' ? 12 : 13} className="py-12 text-center text-slate-400">
                    ไม่พบรายการข้อมูลตามตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredEntries.map((r) => {
                  const p = profit(r);
                  const isW = isWorkDay(r);
                  const distVal = r.distance ? parseFloat(r.distance.toString()).toFixed(1) : '—';

                  return (
                    <tr
                      key={r.id}
                      className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isW ? '' : 'opacity-70 bg-slate-50/30 dark:bg-slate-900/40'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 whitespace-nowrap px-3.5 py-3 text-slate-900 dark:text-white shadow-[1px_0_0_0_#f1f5f9] dark:shadow-[1px_0_0_0_#1e293b]">
                        <div className="font-bold text-sm tracking-wide text-emerald-700 dark:text-emerald-400 font-mono">{fmtDateSlash(r.date)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{fmtDateTh(r.date)}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium">
                        {Number(r.grab) > 0 ? fmt(r.grab) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium">
                        {Number(r.tip) > 0 ? fmt(r.tip) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(income(r))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                        {distVal !== '—' ? `${distVal} กม.` : <span className="text-slate-300 font-normal">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                        {Number(r.oil) > 0 ? fmt(r.oil) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                        {Number(r.oil_real) > 0 ? fmt(r.oil_real) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                        {Number(r.credit) > 0 ? fmt(r.credit) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                        {Number(r.withdraw) > 0 ? fmt(r.withdraw) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">
                        {r.hours ? `${r.hours} ชม.` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <span className={`font-black ${p >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {fmt(p)}
                        </span>
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-3 text-xs text-slate-500 dark:text-slate-400" title={r.note || ''}>
                        {r.note || <span className="text-slate-300">—</span>}
                      </td>
                      {userRole !== 'guest' && (
                        <td className="whitespace-nowrap px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingEntry({ ...r })}
                              title="แก้ไขข้อมูล"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 transition active:scale-95"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(r.id)}
                              title="ลบข้อมูล"
                              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition active:scale-95"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel Import Preview Modal */}
      {mounted && pendingImport && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    📥 นำเข้าข้อมูลจากไฟล์ Excel
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    ตรวจพบข้อมูลทั้งหมด <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{pendingImport.length}</strong> วัน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingImport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 overflow-y-auto flex-1 pr-1">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                ตัวอย่างข้อมูล 5 รายการแรก (หากวันที่ซ้ำ ระบบจะอัปเดตข้อมูลให้ทันที):
              </p>

              <div className="max-h-52 sm:max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">วันที่</th>
                      <th className="p-2.5 text-right">Grab</th>
                      <th className="p-2.5 text-right">ระยะทาง</th>
                      <th className="p-2.5 text-right">น้ำมัน</th>
                      <th className="p-2.5">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingImport.slice(0, 5).map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtDateSlash(row.date)}</td>
                        <td className="p-2.5 text-right font-medium">{fmt(row.grab)} ฿</td>
                        <td className="p-2.5 text-right text-blue-600 dark:text-blue-400">{row.distance ? `${row.distance} กม.` : '—'}</td>
                        <td className="p-2.5 text-right text-rose-500 font-medium">{fmt(row.oil)} ฿</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[120px]">{row.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importStatusMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>{importStatusMsg}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setPendingImport(null)}
                className="rounded-xl border border-slate-200 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmImport}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 disabled:opacity-50 active:scale-95"
              >
                {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-sm">📥</span>}
                <span>ยืนยันนำเข้าข้อมูล ({pendingImport.length} วัน)</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {mounted && editingEntry && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                ✏️ แก้ไขข้อมูลวันที่ {fmtDateTh(editingEntry.date)}
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 overflow-y-auto flex-1 pr-1">
              <div>
                <ThaiDatePicker
                  value={editingEntry.date}
                  onChange={(d) => setEditingEntry({ ...editingEntry, date: d })}
                  label="📅 วันที่ (วัน/เดือน/ปี)"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grab (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.grab}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grab: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm font-semibold dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tip (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.tip}
                    onChange={(e) => setEditingEntry({ ...editingEntry, tip: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm font-semibold dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ระยะทาง (กม.)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.distance || ''}
                    onChange={(e) => {
                      const dist = parseFloat(e.target.value);
                      const rate = fuelSettings.rate_km_per_l || 71.4;
                      const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
                      const newOil = dist > 0 ? parseFloat(((dist / rate) * price).toFixed(2)) : editingEntry.oil;
                      setEditingEntry({ ...editingEntry, distance: dist || null, oil: newOil });
                    }}
                    className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-base sm:text-sm font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ค่าน้ำมัน (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.oil}
                    onChange={(e) => setEditingEntry({ ...editingEntry, oil: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm font-semibold text-rose-600 dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ถอนเข้ากรุงศรี (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.withdraw}
                    onChange={(e) => setEditingEntry({ ...editingEntry, withdraw: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ชั่วโมงขับ</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={editingEntry.hours || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hours: parseFloat(e.target.value) || null })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={editingEntry.note}
                  onChange={(e) => setEditingEntry({ ...editingEntry, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="rounded-xl border border-slate-200 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 active:scale-95"
                >
                  {editLoading ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      {mounted && deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบข้อมูล?</h3>
            <p className="mt-1 text-xs text-slate-500">ข้อมูลนี้จะถูกลบออกจาก Supabase อย่างถาวร</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 active:scale-95"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
