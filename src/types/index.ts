export interface Entry {
  id: string;
  date: string;
  grab: number;
  tip: number;
  trips?: number | null;
  odometer?: number | null;
  distance: number | null;
  oil: number;
  oil_real: number;
  credit: number;
  withdraw: number;
  hours: number | null;
  note: string;
  created_at?: string;
  updated_at?: string;
}

export interface FuelSettings {
  id?: number;
  brand: 'bcp' | 'ptt';
  fuel_type: string;
  rate_km_per_l: number;
  manual_price: number | null;
  last_fetched_price: number;
  last_fetched_date: string;
}

export type TabType = 'dashboard' | 'entry' | 'history' | 'monthly';

export type UserRole = 'admin' | 'guest';

export interface BotSettings {
  id?: number;
  daily_goal: number;
  weekly_trips_goal: number;
  monthly_goal: number;
  engine_oil_interval_km: number;
  last_engine_oil_odo: number;
  gear_oil_interval_km: number;
  last_gear_oil_odo: number;
  tax_expire_date: string | null;
  last_notified_oil_date?: string;
  last_weekly_report_date?: string;
  pending_draft?: Record<string, unknown> | null;
  updated_at?: string;
}
