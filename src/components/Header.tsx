'use client';

import React from 'react';
import { TabType, FuelSettings, UserRole } from '@/types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Calendar, 
  Fuel, 
  SlidersHorizontal, 
  Moon, 
  Sun, 
  Radio, 
  LogOut, 
  Bell,
  Bike
} from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isRealtime: boolean;
  fuelSettings: FuelSettings;
  onOpenFuelModal: () => void;
  onOpenLineModal?: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  userRole: UserRole | null;
  onLogout: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  isRealtime,
  fuelSettings,
  onOpenFuelModal,
  onOpenLineModal,
  darkMode,
  setDarkMode,
  userRole,
  onLogout,
}: HeaderProps) {
  const currentPrice = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
  const brandName = fuelSettings.brand === 'ptt' ? 'ปตท.' : 'บางจาก';
  const fuelName = fuelSettings.fuel_type === 'gasohol_91' ? '91' :
                   fuelSettings.fuel_type === 'gasohol_e20' ? 'E20' :
                   fuelSettings.fuel_type === 'diesel' ? 'ดีเซล' : '95';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        
        {/* Top bar: Brand + telemetry pills + utility controls */}
        <div className="flex h-14 sm:h-16 items-center justify-between gap-3">
          
          {/* Brand & live indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-sm">
              <Bike className="w-5 h-5" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  Grab บัญชีรายวัน
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                  <span className={`h-1.5 w-1.5 rounded-full ${isRealtime ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isRealtime ? 'LIVE SYNC' : 'AUTO SYNC'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate hidden xs:block">
                ระบบคำนวณกำไรสุทธิและค่าน้ำมันอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Right Action Center */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Live Fuel Price Ticker */}
            <button
              onClick={onOpenFuelModal}
              title="คลิกเพื่อตั้งค่าและตรวจสอบราคาน้ำมันสด"
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition cursor-pointer"
            >
              <Fuel className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline text-slate-500 dark:text-slate-400 font-sans">
                {brandName} {fuelName}
              </span>
              <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                ฿{currentPrice.toFixed(2)}
              </span>
              <SlidersHorizontal className="h-3 w-3 text-slate-400 hidden sm:inline" />
            </button>

            {/* LINE Notification Hook */}
            {userRole !== 'guest' && onOpenLineModal && (
              <button
                onClick={onOpenLineModal}
                title="ตั้งค่าแจ้งเตือน LINE Flex Message"
                className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline font-mono text-[11px]">LINE</span>
              </button>
            )}

            {/* User Role Tag */}
            {userRole === 'admin' ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                Admin
              </span>
            ) : userRole === 'guest' ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 sm:py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 font-mono">
                Guest
              </span>
            ) : null}

            {/* Dark / Light Mode Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Clean Segmented Style */}
        <nav className="flex space-x-1.5 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800/80 -mx-3 px-3 sm:mx-0 sm:px-0">
          {[
            { id: 'dashboard', label: 'ภาพรวมบัญชี', icon: LayoutDashboard },
            ...(userRole === 'guest' ? [] : [{ id: 'entry', label: 'บันทึกงานประจำวัน', icon: PlusCircle }]),
            { id: 'history', label: 'ประวัติรอบขับ', icon: History },
            { id: 'monthly', label: 'สรุปผลรายเดือน', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400 dark:text-slate-950' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
