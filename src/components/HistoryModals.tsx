'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Entry, FuelSettings } from '@/types';
import { fmt, fmtDateSlash, fmtDateTh, tripsCount } from '@/lib/utils';
import { FileSpreadsheet, Loader2, Trash2, X } from 'lucide-react';
import ThaiDatePicker from './ThaiDatePicker';

interface ImportPreviewModalProps {
  pendingImport: Entry[] | null;
  isImporting: boolean;
  importStatusMsg: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ImportPreviewModal({
  pendingImport,
  isImporting,
  importStatusMsg,
  onCancel,
  onConfirm,
}: ImportPreviewModalProps) {
  if (!pendingImport || typeof document === 'undefined') return null;

  return createPortal(
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
            onClick={onCancel}
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
                  <th className="p-2.5 text-right">จำนวนงาน</th>
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
                    <td className="p-2.5 text-right font-bold text-violet-600 dark:text-violet-400">{tripsCount(row) > 0 ? `${tripsCount(row)} งาน` : '—'}</td>
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
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 disabled:opacity-50 active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isImporting}
            onClick={onConfirm}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 disabled:opacity-50 active:scale-95"
          >
            {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-sm">📥</span>}
            <span>ยืนยันนำเข้าข้อมูล ({pendingImport.length} วัน)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface EditEntryModalProps {
  editingEntry: Entry | null;
  editLoading: boolean;
  fuelSettings: FuelSettings;
  onChange: (entry: Entry) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export function EditEntryModal({
  editingEntry,
  editLoading,
  fuelSettings,
  onChange,
  onClose,
  onSave,
}: EditEntryModalProps) {
  if (!editingEntry || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            ✏️ แก้ไขข้อมูลวันที่ {fmtDateTh(editingEntry.date)}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="mt-4 space-y-3 overflow-y-auto flex-1 pr-1">
          <div>
            <ThaiDatePicker
              value={editingEntry.date}
              onChange={(d) => onChange({ ...editingEntry, date: d })}
              label="📅 วันที่ (วัน/เดือน/ปี)"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grab (บาท)</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={editingEntry.grab}
                onChange={(e) => onChange({ ...editingEntry, grab: parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => onChange({ ...editingEntry, tip: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm font-semibold dark:border-slate-800 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">จำนวนงาน</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="0"
                value={editingEntry.trips ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange({ ...editingEntry, trips: !isNaN(val) && val > 0 ? val : null });
                }}
                className="w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-base sm:text-sm font-bold text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300"
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
                  onChange({ ...editingEntry, distance: dist || null, oil: newOil });
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
                onChange={(e) => onChange({ ...editingEntry, oil: parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => onChange({ ...editingEntry, withdraw: parseFloat(e.target.value) || 0 })}
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
                onChange={(e) => onChange({ ...editingEntry, hours: parseFloat(e.target.value) || null })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุ</label>
            <input
              type="text"
              value={editingEntry.note}
              onChange={(e) => onChange({ ...editingEntry, note: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
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
  );
}

interface DeleteConfirmModalProps {
  deleteConfirmId: string | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteConfirmModal({
  deleteConfirmId,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!deleteConfirmId || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-3">
          <Trash2 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">ยืนยันการลบข้อมูล?</h3>
        <p className="mt-1 text-xs text-slate-500">ข้อมูลนี้จะถูกลบออกจาก Supabase อย่างถาวร</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm(deleteConfirmId)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 active:scale-95"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
