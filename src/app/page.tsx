'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Entry, FuelSettings, TabType, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import DashboardTab from '@/components/DashboardTab';
import EntryTab from '@/components/EntryTab';
import HistoryTab from '@/components/HistoryTab';
import MonthlyTab from '@/components/MonthlyTab';
import FuelSettingsModal from '@/components/FuelSettingsModal';
import LoginScreen from '@/components/LoginScreen';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('grab_user_role') as UserRole | null;
      if (stored === 'admin' || stored === 'guest') {
        setUserRole(stored);
      }
    } catch {
      // ignore storage errors
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const [fuelSettings, setFuelSettings] = useState<FuelSettings>({
    brand: 'bcp',
    fuel_type: 'gasohol_95',
    rate_km_per_l: 71.4,
    manual_price: null,
    last_fetched_price: 39.09,
    last_fetched_date: '',
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch entries
      const { data: entryData, error: entryErr } = await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false });

      if (entryErr) console.error('Error fetching entries:', entryErr);
      if (entryData) setEntries(entryData as Entry[]);

      // 2. Fetch fuel settings
      const { data: fuelData } = await supabase
        .from('fuel_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (fuelData) {
        setFuelSettings(fuelData as FuelSettings);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Setup Supabase Realtime Subscription
    const channel = supabase
      .channel('entries_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEntries((prev) => {
              const updated = [payload.new as Entry, ...prev.filter(r => r.id !== (payload.new as Entry).id)];
              return updated.sort((a, b) => b.date.localeCompare(a.date));
            });
          } else if (payload.eventType === 'UPDATE') {
            setEntries((prev) =>
              prev.map((r) => (r.id === (payload.new as Entry).id ? (payload.new as Entry) : r))
            );
          } else if (payload.eventType === 'DELETE') {
            setEntries((prev) => prev.filter((r) => r.id !== (payload.old as Entry).id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    try {
      localStorage.setItem('grab_user_role', role);
    } catch {}
    if (role === 'guest' && activeTab === 'entry') {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
      try {
        localStorage.removeItem('grab_user_role');
      } catch {}
      setUserRole(null);
      setActiveTab('dashboard');
    }
  };

  // If auth state is not checked yet, show quick loader
  if (!authChecked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If not logged in, render the Login Screen
  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold">กำลังเชื่อมต่อฐานข้อมูล Supabase...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRealtime={isRealtime}
        fuelSettings={fuelSettings}
        onOpenFuelModal={() => setIsFuelModalOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        userRole={userRole}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && <DashboardTab entries={entries} />}
        {activeTab === 'entry' && userRole === 'admin' && (
          <EntryTab
            fuelSettings={fuelSettings}
            onSuccess={() => {
              fetchData();
              setActiveTab('history');
            }}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            entries={entries}
            fuelSettings={fuelSettings}
            onRefresh={fetchData}
            userRole={userRole}
          />
        )}
        {activeTab === 'monthly' && <MonthlyTab entries={entries} />}
      </main>

      {/* Fuel Settings Modal */}
      <FuelSettingsModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        fuelSettings={fuelSettings}
        onUpdated={(newSettings) => setFuelSettings(newSettings)}
        userRole={userRole}
      />
    </div>
  );
}
