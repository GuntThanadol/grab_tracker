export interface Entry {
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
  brand: 'bcp' | 'ptt';
  fuel_type: string;
  rate_km_per_l: number;
  manual_price: number | null;
  last_fetched_price: number;
  last_fetched_date: string;
}

export type TabType = 'dashboard' | 'entry' | 'history' | 'monthly';
