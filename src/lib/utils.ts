import { Entry } from '@/types';

/**
 * Historical daily completed trips extracted from official Grab Weekly Incentive PDFs
 * (2026-W16 through 2026-W45: 21 Apr 2026 – 6 Nov 2026)
 */
export const HISTORICAL_TRIPS_BY_DATE: Record<string, number> = {
  // W17 (20-26 Apr 2026)
  '2026-04-21': 1,
  '2026-04-22': 9,
  '2026-04-23': 8,
  '2026-04-24': 8,
  // W18 (27 Apr - 3 May 2026)
  '2026-04-27': 11,
  '2026-04-28': 10,
  '2026-04-29': 10,
  '2026-04-30': 8,
  '2026-05-01': 11,
  // W19 (4-10 May 2026)
  '2026-05-04': 13,
  '2026-05-05': 8,
  '2026-05-06': 11,
  '2026-05-07': 10,
  '2026-05-08': 11,
  // W20 (11-17 May 2026)
  '2026-05-11': 12,
  '2026-05-13': 16,
  '2026-05-14': 8,
  '2026-05-15': 8,
  // W21 (18-24 May 2026)
  '2026-05-18': 7,
  '2026-05-19': 9,
  '2026-05-21': 11,
  '2026-05-22': 11,
  // W22 (25-31 May 2026)
  '2026-05-25': 12,
  '2026-05-26': 10,
  '2026-05-27': 8,
  '2026-05-28': 15,
  '2026-05-29': 8,
  // W23 (1-7 Jun 2026)
  '2026-06-01': 10,
  '2026-06-02': 7,
  '2026-06-03': 12,
  '2026-06-04': 11,
  '2026-06-05': 8,
  // W24 (8-14 Jun 2026)
  '2026-06-08': 7,
  '2026-06-09': 9,
  '2026-06-10': 11,
  '2026-06-11': 10,
  '2026-06-12': 6,
  // W25 (15-21 Jun 2026)
  '2026-06-15': 12,
  '2026-06-16': 9,
  '2026-06-17': 10,
  '2026-06-18': 8,
  '2026-06-19': 11,
  // W26 (22-28 Jun 2026)
  '2026-06-22': 9,
  '2026-06-23': 7,
  '2026-06-24': 12,
  '2026-06-25': 6,
  '2026-06-26': 10,
  // W27 (29 Jun - 5 Jul 2026)
  '2026-06-29': 6,
  '2026-06-30': 12,
  '2026-07-01': 11,
  // W29 (13-19 Jul 2026)
  '2026-07-13': 7,
  '2026-07-14': 6,
  '2026-07-15': 7,
  '2026-07-16': 9,
  '2026-07-17': 8,
  // W30 (20-26 Jul 2026)
  '2026-07-20': 12,
  '2026-07-21': 8,
  '2026-07-22': 8,
  '2026-07-23': 9,
  '2026-07-24': 9,
  // W31 (27 Jul - 2 Aug 2026)
  '2026-07-27': 9,
  '2026-07-28': 4,
  '2026-07-29': 9,
  '2026-07-31': 7,
  // W32 (3-9 Aug 2026)
  '2026-08-03': 11,
  '2026-08-04': 11,
  '2026-08-05': 12,
  '2026-08-06': 9,
  // W33 (10-16 Aug 2026)
  '2026-08-10': 7,
  '2026-08-11': 8,
  // W34 (17-23 Aug 2026)
  '2026-08-17': 8,
  '2026-08-18': 10,
  '2026-08-19': 7,
  '2026-08-20': 7,
  '2026-08-21': 8,
  // W35 (24-30 Aug 2026)
  '2026-08-25': 9,
  '2026-08-26': 7,
  '2026-08-27': 9,
  '2026-08-28': 10,
  // W36 (31 Aug - 6 Sep 2026)
  '2026-08-31': 11,
  '2026-09-01': 11,
  '2026-09-02': 11,
  '2026-09-03': 9,
  '2026-09-04': 9,
  // W38 (14-20 Sep 2026)
  '2026-09-15': 7,
  '2026-09-16': 6,
  '2026-09-17': 7,
  // W39 (21-27 Sep 2026)
  '2026-09-22': 7,
  '2026-09-23': 10,
  '2026-09-24': 6,
  // W40 (28 Sep - 4 Oct 2026)
  '2026-10-01': 7,
  '2026-10-02': 9,
  // W43 (19-25 Oct 2026)
  '2026-10-21': 8,
  // W44 (26 Oct - 1 Nov 2026)
  '2026-10-26': 9,
  '2026-10-27': 10,
  '2026-10-28': 9,
  '2026-10-30': 7,
  // W45 (2-8 Nov 2026)
  '2026-11-02': 8,
  '2026-11-04': 11,
  '2026-11-05': 5,
  '2026-11-06': 8,
};

const CUSTOM_TRIPS_STORAGE_KEY = 'grab_custom_trips';

export function getLocalCustomTrips(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_TRIPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalCustomTrip(date: string, trips: number | null): void {
  if (typeof window === 'undefined' || !date) return;
  try {
    const map = getLocalCustomTrips();
    if (trips === null || isNaN(Number(trips)) || Number(trips) <= 0) {
      delete map[date];
    } else {
      map[date] = Math.round(Number(trips));
    }
    localStorage.setItem(CUSTOM_TRIPS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function tripsCount(r: Entry): number {
  if (r.trips !== null && r.trips !== undefined && !isNaN(Number(r.trips)) && Number(r.trips) > 0) {
    return Math.round(Number(r.trips));
  }
  const customMap = getLocalCustomTrips();
  if (r.date && customMap[r.date] !== undefined) {
    return Number(customMap[r.date]) || 0;
  }
  if (r.date && HISTORICAL_TRIPS_BY_DATE[r.date] !== undefined) {
    return HISTORICAL_TRIPS_BY_DATE[r.date];
  }
  if (r.note) {
    const m = r.note.match(/(\d+)\s*งาน/);
    if (m) return parseInt(m[1], 10) || 0;
  }
  return 0;
}

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 });
}

export function income(r: Entry): number {
  return (Number(r.grab) || 0) + (Number(r.tip) || 0);
}

export function profit(r: Entry): number {
  return income(r) - (Number(r.oil) || 0);
}

export function isWorkDay(r: Entry): boolean {
  return (Number(r.grab) || 0) > 0 || (Number(r.oil) || 0) > 0 || (Number(r.hours) || 0) > 0 || tripsCount(r) > 0;
}

export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const TH_MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const TH_DOWS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
export const TH_DOWS_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/**
 * Returns current date strictly in Thailand timezone (Asia/Bangkok, UTC+7)
 * Output: YYYY-MM-DD
 */
export function getTodayThai(): string {
  const now = new Date();
  const thDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // en-CA gives YYYY-MM-DD
  return thDateStr;
}

/**
 * Format date as DD/MM/YYYY (e.g. 18/09/2026)
 */
export function fmtDateSlash(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * Format date with Thai month and Buddhist era year
 * e.g. 18 ก.ย. 2569 (ศ.)
 */
export function fmtDateTh(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  const dow = TH_DOWS_S[dt.getDay()] || '';
  return `${d} ${TH_MONTHS_S[m]} ${y + 543} (${dow})`;
}
