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
import LineSettingsModal from '@/components/LineSettingsModal';
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
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const updateUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        setUserRole(null);
      } else {
        const { data: admin } = await supabase.from('app_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
        if (active) setUserRole(admin ? 'admin' : 'guest');
      }
      if (active) setAuthChecked(true);
    };
    updateUserRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { updateUserRole(); });
    return () => { active = false; subscription.unsubscribe(); };
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
    if (!userRole) return;
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
  }, [fetchData, userRole]);

  const handleLogin = () => {
    setLoading(true);
  };

  const handleLogout = async () => {
    if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
      await supabase.auth.signOut();
      setUserRole(null);
      setEntries([]);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors animate-fade-in">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRealtime={isRealtime}
        fuelSettings={fuelSettings}
        onOpenFuelModal={() => setIsFuelModalOpen(true)}
        onOpenLineModal={() => setIsLineModalOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        userRole={userRole}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6">
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

      {/* LINE Notification Settings Modal */}
      <LineSettingsModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        userRole={userRole}
      />
    </div>
  );
}
