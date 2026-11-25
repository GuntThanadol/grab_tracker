import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BotSettings, Entry, FuelSettings } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  id: 1,
  daily_goal: 400,
  weekly_trips_goal: 45,
  monthly_goal: 8000,
  engine_oil_interval_km: 2500,
  last_engine_oil_odo: 0,
  gear_oil_interval_km: 5000,
  last_gear_oil_odo: 0,
  tax_expire_date: null,
  last_notified_oil_date: '',
  last_weekly_report_date: '',
  pending_draft: null,
};

export const DEFAULT_FUEL_SETTINGS: FuelSettings = {
  id: 1,
  brand: 'bcp',
  fuel_type: 'gasohol_95',
  rate_km_per_l: 71.4,
  manual_price: null,
  last_fetched_price: 39.09,
  last_fetched_date: '',
};

/**
 * Creates a server-only Supabase client with the Service Role key (bypasses RLS for webhook/cron).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Verifies an incoming browser request's Supabase Bearer token against app_admins.
 * Returns both the authenticated status and an authenticated Supabase client.
 */
export async function verifyAdminBearer(request: NextRequest): Promise<{
  isAdmin: boolean;
  client: SupabaseClient | null;
}> {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return { isAdmin: false, client: null };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return { isAdmin: false, client: null };

  const { data: admin } = await client
    .from('app_admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  return { isAdmin: Boolean(admin), client: admin ? client : null };
}

/**
 * Fetches bot_settings row id=1, falling back gracefully to defaults if the table hasn't been migrated yet.
 */
export async function fetchBotSettingsServer(
  client: SupabaseClient
): Promise<{ settings: BotSettings; tableExists: boolean }> {
  try {
    const { data, error } = await client
      .from('bot_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('bot_settings') || msg.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST205') {
        return { settings: { ...DEFAULT_BOT_SETTINGS }, tableExists: false };
      }
      return { settings: { ...DEFAULT_BOT_SETTINGS }, tableExists: false };
    }

    if (!data) {
      return { settings: { ...DEFAULT_BOT_SETTINGS }, tableExists: true };
    }

    return {
      tableExists: true,
      settings: {
        ...DEFAULT_BOT_SETTINGS,
        ...data,
        daily_goal: Number(data.daily_goal) || DEFAULT_BOT_SETTINGS.daily_goal,
        weekly_trips_goal: Number(data.weekly_trips_goal) || DEFAULT_BOT_SETTINGS.weekly_trips_goal,
        monthly_goal: Number(data.monthly_goal) || DEFAULT_BOT_SETTINGS.monthly_goal,
        engine_oil_interval_km: Number(data.engine_oil_interval_km) || DEFAULT_BOT_SETTINGS.engine_oil_interval_km,
        last_engine_oil_odo: Number(data.last_engine_oil_odo) || 0,
        gear_oil_interval_km: Number(data.gear_oil_interval_km) || DEFAULT_BOT_SETTINGS.gear_oil_interval_km,
        last_gear_oil_odo: Number(data.last_gear_oil_odo) || 0,
        tax_expire_date: data.tax_expire_date || null,
      },
    };
  } catch {
    return { settings: { ...DEFAULT_BOT_SETTINGS }, tableExists: false };
  }
}

/**
 * Updates bot_settings row id=1 safely. Returns whether the update succeeded and if the table exists.
 */
export async function upsertBotSettingsServer(
  client: SupabaseClient,
  patch: Partial<BotSettings>
): Promise<{ success: boolean; tableExists: boolean; settings: BotSettings; error?: string }> {
  const { settings: current, tableExists } = await fetchBotSettingsServer(client);
  if (!tableExists) {
    return {
      success: false,
      tableExists: false,
      settings: current,
      error: 'ยังไม่ได้สร้างตาราง bot_settings ใน Supabase (กรุณารันไฟล์ migration)',
    };
  }

  const nextRow = {
    id: 1,
    daily_goal: patch.daily_goal !== undefined ? Number(patch.daily_goal) : current.daily_goal,
    weekly_trips_goal: patch.weekly_trips_goal !== undefined ? Math.round(Number(patch.weekly_trips_goal)) : current.weekly_trips_goal,
    monthly_goal: patch.monthly_goal !== undefined ? Number(patch.monthly_goal) : current.monthly_goal,
    engine_oil_interval_km: patch.engine_oil_interval_km !== undefined ? Math.round(Number(patch.engine_oil_interval_km)) : current.engine_oil_interval_km,
    last_engine_oil_odo: patch.last_engine_oil_odo !== undefined ? Number(patch.last_engine_oil_odo) : current.last_engine_oil_odo,
    gear_oil_interval_km: patch.gear_oil_interval_km !== undefined ? Math.round(Number(patch.gear_oil_interval_km)) : current.gear_oil_interval_km,
    last_gear_oil_odo: patch.last_gear_oil_odo !== undefined ? Number(patch.last_gear_oil_odo) : current.last_gear_oil_odo,
    tax_expire_date: patch.tax_expire_date !== undefined ? patch.tax_expire_date : current.tax_expire_date,
    last_notified_oil_date: patch.last_notified_oil_date !== undefined ? patch.last_notified_oil_date : (current.last_notified_oil_date || ''),
    last_weekly_report_date: patch.last_weekly_report_date !== undefined ? patch.last_weekly_report_date : (current.last_weekly_report_date || ''),
    pending_draft: patch.pending_draft !== undefined ? patch.pending_draft : (current.pending_draft ?? null),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('bot_settings')
    .upsert(nextRow, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    return { success: false, tableExists: true, settings: current, error: error.message };
  }

  return { success: true, tableExists: true, settings: data as BotSettings };
}

/**
 * Fetches fuel_settings row id=1 with fallback defaults.
 */
export async function fetchFuelSettingsServer(client: SupabaseClient): Promise<FuelSettings> {
  try {
    const { data } = await client.from('fuel_settings').select('*').eq('id', 1).maybeSingle();
    return data ? ({ ...DEFAULT_FUEL_SETTINGS, ...data } as FuelSettings) : { ...DEFAULT_FUEL_SETTINGS };
  } catch {
    return { ...DEFAULT_FUEL_SETTINGS };
  }
}

/**
 * Upserts a daily entry by date with column fallback for older schemas missing `trips` or `odometer`.
 */
export async function upsertEntryServer(
  client: SupabaseClient,
  payload: Entry
): Promise<{ entry: Entry; error?: string }> {
  const cleanPayload: Record<string, unknown> = {
    id: payload.id,
    date: payload.date,
    grab: Number(payload.grab) || 0,
    tip: Number(payload.tip) || 0,
    distance: payload.distance !== null && payload.distance !== undefined ? Number(payload.distance) : null,
    oil: Number(payload.oil) || 0,
    oil_real: Number(payload.oil_real) || 0,
    credit: Number(payload.credit) || 0,
    withdraw: Number(payload.withdraw) || 0,
    hours: payload.hours !== null && payload.hours !== undefined ? Number(payload.hours) : null,
    note: (payload.note || '').trim(),
    updated_at: new Date().toISOString(),
  };

  const withTrips = { ...cleanPayload, trips: payload.trips ?? null };
  const full = { ...withTrips, odometer: payload.odometer ?? null };

  const { data, error } = await client
    .from('entries')
    .upsert(full, { onConflict: 'date' })
    .select('*')
    .single();

  if (!error && data) {
    return { entry: data as Entry };
  }

  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('odometer') && !msg.includes('trips')) {
    const { data: retryData, error: retryErr } = await client
      .from('entries')
      .upsert(withTrips, { onConflict: 'date' })
      .select('*')
      .single();
    if (!retryErr && retryData) return { entry: retryData as Entry };
  }

  if (msg.includes('trips') || msg.includes('odometer')) {
    const { data: baseData, error: baseErr } = await client
      .from('entries')
      .upsert(cleanPayload, { onConflict: 'date' })
      .select('*')
      .single();
    if (!baseErr && baseData) return { entry: baseData as Entry };
    return { entry: payload, error: baseErr?.message || error?.message };
  }

  return { entry: payload, error: error?.message || 'ไม่สามารถบันทึกข้อมูลได้' };
}

/**
 * Pure YYYY-MM-DD date arithmetic safe across timezones.
 */
export function shiftDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

/**
 * Returns the Monday..Sunday YYYY-MM-DD range containing `dateStr`, shifted by `weekOffset` weeks.
 */
export function getWeekRange(dateStr: string, weekOffset = 0): { start: string; end: string } {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const start = shiftDateStr(dateStr, diffToMon + weekOffset * 7);
  const end = shiftDateStr(start, 6);
  return { start, end };
}

/**
 * Returns month boundaries and keys for `dateStr` shifted by `monthOffset` months.
 */
export function getMonthRange(
  dateStr: string,
  monthOffset = 0
): { start: string; end: string; monthKey: string; prevMonthKey: string } {
  const [y, m] = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const monthKey = `${ty}-${String(tm).padStart(2, '0')}`;

  const prevTarget = new Date(Date.UTC(ty, tm - 2, 1));
  const prevMonthKey = `${prevTarget.getUTCFullYear()}-${String(prevTarget.getUTCMonth() + 1).padStart(2, '0')}`;

  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
    monthKey,
    prevMonthKey,
  };
}
