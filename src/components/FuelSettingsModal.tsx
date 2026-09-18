'use client';

import React, { useState } from 'react';
import { FuelSettings, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { X, RefreshCw, Save, Fuel } from 'lucide-react';

interface FuelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuelSettings: FuelSettings;
  onUpdated: (newSettings: FuelSettings) => void;
  userRole?: UserRole | null;
}

export default function FuelSettingsModal({
  isOpen,
  onClose,
  fuelSettings,
  onUpdated,
  userRole,
}: FuelSettingsModalProps) {
  const [brand, setBrand] = useState<'bcp' | 'ptt'>(fuelSettings.brand || 'bcp');
  const [fuelType, setFuelType] = useState<string>(fuelSettings.fuel_type || 'gasohol_95');
  const [rate, setRate] = useState<number>(fuelSettings.rate_km_per_l || 71.4);
  const [manualPrice, setManualPrice] = useState<string>(fuelSettings.manual_price ? fuelSettings.manual_price.toString() : '');
  const [isFetching, setIsFetching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentPrice = manualPrice ? parseFloat(manualPrice) : (fuelSettings.last_fetched_price || 39.09);

  // Fetch live prices from thai-oil-api
  const fetchLivePrices = async () => {
    setIsFetching(true);
    setStatusMsg('🔄 กำลังดึงราคาน้ำมันล่าสุด...');
    try {
      const resp = await fetch('https://api.chnwt.dev/thai-oil-api/latest');
      const json = await resp.json();
      if (json?.response?.stations) {
        const brandData = json.response.stations[brand] || json.response.stations.bcp;
        const fuelItem = brandData?.[fuelType] || brandData?.gasohol_95;
        if (fuelItem?.price) {
          const price = parseFloat(fuelItem.price);
          const dateStr = json.response.date || new Date().toLocaleDateString('th-TH');
          
          const updated: FuelSettings = {
            ...fuelSettings,
            brand,
            fuel_type: fuelType,
            rate_km_per_l: rate,
            manual_price: manualPrice ? parseFloat(manualPrice) : null,
            last_fetched_price: price,
            last_fetched_date: dateStr,
          };

          await supabase.from('fuel_settings').upsert({ id: 1, ...updated });
          onUpdated(updated);
          setStatusMsg(`✅ อัปเดตราคาสำเร็จ: ${price.toFixed(2)} บาท/ลิตร (${dateStr})`);
        }
      }
    } catch (err: any) {
      setStatusMsg(`⚠️ ไม่สามารถดึงราคาล่าสุดได้: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'guest') {
      alert('👀 บัญชี Guest ดูข้อมูลได้อย่างเดียว ไม่สามารถเปลี่ยนแปลงการตั้งค่าได้');
      return;
    }
    const updated: FuelSettings = {
      ...fuelSettings,
      brand,
      fuel_type: fuelType,
      rate_km_per_l: rate,
      manual_price: manualPrice ? parseFloat(manualPrice) : null,
    };

    try {
      await supabase.from('fuel_settings').upsert({ id: 1, ...updated });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Fuel className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">⚙️ ตั้งค่าน้ำมันและอัตราสิ้นเปลือง</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Brand */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">สถานีบริการน้ำมัน</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-base sm:text-sm font-medium dark:border-slate-800 dark:bg-slate-800"
            >
              <option value="bcp">🌿 บางจาก (Bangchak)</option>
              <option value="ptt">🔵 ปตท. (PTT Station)</option>
            </select>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทน้ำมัน</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-base sm:text-sm font-medium dark:border-slate-800 dark:bg-slate-800"
            >
              <option value="gasohol_95">แก๊สโซฮอล์ 95 (แนะนำสำหรับ Wave 125i)</option>
              <option value="gasohol_91">แก๊สโซฮอล์ 91</option>
              <option value="gasohol_e20">แก๊สโซฮอล์ E20</option>
              <option value="diesel">ดีเซล</option>
            </select>
          </div>

          {/* Rate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              🛵 อัตราสิ้นเปลือง (กิโลเมตร / ลิตร)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 71.4)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-base sm:text-sm font-bold dark:border-slate-800 dark:bg-slate-800"
            />
            <small className="mt-1 block text-[11px] text-slate-400">
              Honda Wave 125i (2026) ค่ามาตรฐานจากโรงงานคือ <strong>71.4 กม./ลิตร</strong>
            </small>
          </div>

          {/* Manual Price Override */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              กำหนดราคาเอง (บาท/ลิตร) <span className="text-slate-400 font-normal">- ว่างไว้เพื่อใช้ราคาจาก API</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={`ราคาล่าสุด ${fuelSettings.last_fetched_price || 39.09} ฿`}
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-base sm:text-sm dark:border-slate-800 dark:bg-slate-800"
            />
          </div>

          {/* Live Fetch Button */}
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-500">ราคาปัจจุบัน:</span>{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">{currentPrice.toFixed(2)} ฿/ลิตร</strong>
            </div>
            <button
              type="button"
              disabled={isFetching}
              onClick={fetchLivePrices}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              ดึงราคาใหม่
            </button>
          </div>

          {statusMsg && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {statusMsg}
            </div>
          )}

          {userRole === 'guest' && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              👀 บัญชี Guest: ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขหรือบันทึกได้
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 active:scale-95"
            >
              ปิด
            </button>
            {userRole !== 'guest' && (
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30 active:scale-95"
              >
                💾 บันทึกการตั้งค่า
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
