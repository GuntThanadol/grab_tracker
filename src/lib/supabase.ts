import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export interface DriverEntry {
  id: string;
  date: string;
  grab: number;
  tip: number;
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
  brand: string;
  fuel_type: string;
  rate_km_per_l: number;
  manual_price: number | null;
  last_fetched_price: number;
  last_fetched_date: string;
}
