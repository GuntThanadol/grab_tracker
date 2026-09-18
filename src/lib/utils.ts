import { Entry } from '@/types';

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
  return (Number(r.grab) || 0) > 0 || (Number(r.oil) || 0) > 0 || (Number(r.hours) || 0) > 0;
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
