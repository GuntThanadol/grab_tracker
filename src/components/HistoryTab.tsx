'use client';

import React, { useState, useMemo } from 'react';
import { Entry, FuelSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { fmt, income, profit, isWorkDay, fmtDateTh, TH_MONTHS } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Search, Download, Edit2, Trash2, X, Bike, Check, Filter } from 'lucide-react';

interface HistoryTabProps {
  entries: Entry[];
  fuelSettings: FuelSettings;
  onRefresh: () => void;
}

export default function HistoryTab({ entries, fuelSettings, onRefresh }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'work' | 'rest'>('all');
  
  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 pb-12">
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาวันที่ เช่น 2026-09 หรือหมายเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-white transition"
            />
          </div>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
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
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-800">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'work', label: 'วันวิ่งงาน' },
              { id: 'rest', label: 'วันหยุด' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTypeFilter(btn.id as any)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
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

        {/* Export Excel Button */}
        <button
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition shadow-sm shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Export Excel ({filteredEntries.length})</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <th className="px-3.5 py-3">วันที่</th>
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
                <th className="px-3 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
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
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isW ? '' : 'opacity-60 bg-slate-50/30 dark:bg-slate-900/40'
                      }`}
                    >
                      <td className="whitespace-nowrap px-3.5 py-3 font-semibold text-slate-900 dark:text-white">
                        {fmtDateTh(r.date)}
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
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingEntry({ ...r })}
                            title="แก้ไขข้อมูล"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(r.id)}
                            title="ลบข้อมูล"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ✏️ แก้ไขข้อมูลวันที่ {fmtDateTh(editingEntry.date)}
              </h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grab (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.grab}
                    onChange={(e) => setEditingEntry({ ...editingEntry, grab: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tip (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.tip}
                    onChange={(e) => setEditingEntry({ ...editingEntry, tip: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ระยะทาง (กม.)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.distance || ''}
                    onChange={(e) => {
                      const dist = parseFloat(e.target.value);
                      const rate = fuelSettings.rate_km_per_l || 71.4;
                      const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
                      const newOil = dist > 0 ? parseFloat(((dist / rate) * price).toFixed(2)) : editingEntry.oil;
                      setEditingEntry({ ...editingEntry, distance: dist || null, oil: newOil });
                    }}
                    className="w-full rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ค่าน้ำมัน (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.oil}
                    onChange={(e) => setEditingEntry({ ...editingEntry, oil: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ถอนเข้ากรุงศรี (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.withdraw}
                    onChange={(e) => setEditingEntry({ ...editingEntry, withdraw: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ชั่วโมงขับ</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.hours || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hours: parseFloat(e.target.value) || null })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={editingEntry.note}
                  onChange={(e) => setEditingEntry({ ...editingEntry, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30"
                >
                  {editLoading ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบข้อมูล?</h3>
            <p className="mt-1 text-xs text-slate-500">ข้อมูลนี้จะถูกลบออกจาก Supabase อย่างถาวร</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
