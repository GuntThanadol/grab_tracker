'use client';

import React from 'react';
import { TabType, FuelSettings, UserRole } from '@/types';
import { LayoutDashboard, PlusCircle, History, Calendar, Fuel, Settings2, Moon, Sun, Wifi, WifiOff, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isRealtime: boolean;
  fuelSettings: FuelSettings;
  onOpenFuelModal: () => void;
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 shadow-sm transition-colors">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Realtime indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-md shadow-emerald-500/20">
              <span className="text-lg sm:text-xl font-bold">🏍️</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Grab บัญชีรายวัน
                </h1>
                <span className="hidden sm:inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Supabase Live
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {isRealtime ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <Wifi className="h-3 w-3" /> <span className="hidden xs:inline">เชื่อมต่อสด</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <WifiOff className="h-3 w-3" /> <span className="hidden xs:inline">ซิงค์อัตโนมัติ</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Actions: Fuel pill, Role & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Fuel Price Badge */}
            <button
              onClick={onOpenFuelModal}
              title="ตั้งค่าน้ำมันและดูราคาสด"
              className="flex items-center gap-1 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              <Fuel className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline text-slate-500 dark:text-slate-400">{brandName} {fuelName}:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{currentPrice.toFixed(2)} ฿</strong>
              <Settings2 className="h-3 w-3 text-slate-400 hover:text-slate-600 hidden sm:inline" />
            </button>

            {/* Role Badge */}
            {userRole === 'admin' ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                👑 Admin
              </span>
            ) : userRole === 'guest' ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                👀 Guest
              </span>
            ) : null}

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition active:scale-95"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="ออกจากระบบ"
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/60 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60 transition shadow-sm active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-100 dark:border-slate-800/80 -mx-3 px-3 sm:mx-0 sm:px-0">
          {[
            { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
            ...(userRole === 'guest' ? [] : [{ id: 'entry', label: 'บันทึกงานวันนี้', icon: PlusCircle }]),
            { id: 'history', label: 'ประวัติรายวัน', icon: History },
            { id: 'monthly', label: 'สรุปรายเดือน', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-bold sm:font-semibold transition-all shrink-0 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 dark:bg-emerald-500 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
