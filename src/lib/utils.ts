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
export const TH_DOWS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function fmtDateTh(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  const dow = TH_DOWS[dt.getDay()] || '';
  return `${d} ${TH_MONTHS_S[m]} ${y + 543} (${dow})`;
}
