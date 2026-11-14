import * as XLSX from '@e965/xlsx';
import { Entry, FuelSettings } from '@/types';
import { income, profit, tripsCount } from '@/lib/utils';

type CellValue = string | number | boolean | null | undefined;

export function exportEntriesToExcel(entries: Entry[]): void {
  const wsData = [
    [
      'วันที่',
      'จำนวนงาน (งาน)',
      'รายได้ Grab (บาท)',
      'Tip มือ (บาท)',
      'รายได้รวม (บาท)',
      'ระยะทาง (กม.)',
      'ค่าน้ำมัน (บาท)',
      'เติมน้ำมันจริง (บาท)',
      'เครดิต Grab (บาท)',
      'ถอนเข้ากรุงศรี (บาท)',
      'ชั่วโมงขับ',
      'กำไรสุทธิ (บาท)',
      'หมายเหตุ',
    ],
    ...entries.map((r) => [
      r.date,
      tripsCount(r) || '',
      Number(r.grab) || 0,
      Number(r.tip) || 0,
      income(r),
      Number(r.distance) || '',
      Number(r.oil) || 0,
      Number(r.oil_real) || 0,
      Number(r.credit) || 0,
      Number(r.withdraw) || 0,
      Number(r.hours) || '',
      profit(r),
      r.note || '',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'บัญชีรายวัน');
  XLSX.writeFile(wb, `Grab_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function toFloat(val: CellValue): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseExcelBuffer(
  data: ArrayBuffer | string,
  fuelSettings: FuelSettings
): Entry[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: false });

  const isDateSerial = (v: CellValue) => typeof v === 'number' && v > 30000 && v < 70000;
  const isDateString = (v: CellValue) =>
    typeof v === 'string' && (/\d{4}-\d{2}-\d{2}/.test(v) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(v));
  const isDateCell = (v: CellValue) => isDateSerial(v) || isDateString(v);

  let rawRows: CellValue[][] | null = null;
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<CellValue[]>(wb.Sheets[sheetName], {
      header: 1,
      defval: null,
    });
    if (rows.some((r) => r && isDateCell(r[0]))) {
      rawRows = rows;
      break;
    }
  }

  if (!rawRows) {
    throw new Error('ไม่พบข้อมูลวันที่ในไฟล์ Excel');
  }

  const firstDataRowIdx = rawRows.findIndex((r) => r && isDateCell(r[0]));
  if (firstDataRowIdx < 0) {
    throw new Error('ไม่พบแถวข้อมูลในไฟล์');
  }

  const headerRow = firstDataRowIdx > 0 ? rawRows[firstDataRowIdx - 1] : [];
  const headers = (headerRow || []).map((h) => (h ? String(h).toLowerCase() : ''));

  const colOf = (kws: string[]) => {
    for (const kw of kws) {
      const i = headers.findIndex((h) => h.includes(kw.toLowerCase()));
      if (i >= 0) return i;
    }
    return -1;
  };

  const cTrips = colOf(['จำนวนงาน', 'trips']);
  const cGrab = colOf(['grab', 'แกร็บ']) >= 0 ? colOf(['grab', 'แกร็บ']) : 1;
  const cTip = colOf(['tip', 'ทิป']) >= 0 ? colOf(['tip', 'ทิป']) : 2;
  const cDist = colOf(['ระยะทาง', 'distance', 'กม']);
  const cOil = colOf(['ค่าน้ำมัน', 'ประมาณการ']) >= 0 ? colOf(['ค่าน้ำมัน', 'ประมาณการ']) : 4;
  const cOilReal = colOf(['เติมจริง', 'เติมน้ำมันจริง']) >= 0 ? colOf(['เติมจริง', 'เติมน้ำมันจริง']) : 5;
  const cCredit = colOf(['เครดิต', 'credit']) >= 0 ? colOf(['เครดิต', 'credit']) : 6;
  const cWithdraw = colOf(['ถอน', 'withdraw']) >= 0 ? colOf(['ถอน', 'withdraw']) : 7;
  const cHours = colOf(['ชั่วโมง', 'ชม', 'hours']);
  const cNote = colOf(['หมายเหตุ', 'note']) >= 0 ? colOf(['หมายเหตุ', 'note']) : 9;

  const parseExcelDate = (val: CellValue): string | null => {
    if (val == null) return null;
    if (typeof val === 'number' && val > 30000 && val < 70000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    const str = String(val).trim();
    const mIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mIso) {
      let y = parseInt(mIso[1], 10);
      if (y > 2500) y -= 543;
      return `${y}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
    }
    const mSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mSlash) {
      let y = parseInt(mSlash[3], 10);
      if (y > 2500) y -= 543;
      return `${y}-${mSlash[2].padStart(2, '0')}-${mSlash[1].padStart(2, '0')}`;
    }
    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        d.setHours(d.getHours() + 7);
        return d.toISOString().slice(0, 10);
      }
    }
    return null;
  };

  const parsed: Entry[] = [];
  for (let i = firstDataRowIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const dateStr = parseExcelDate(row[0]);
    if (!dateStr) continue;

    let dist = cDist >= 0 && row[cDist] != null ? toFloat(row[cDist]) || null : null;
    const oil = cOil >= 0 && row[cOil] != null ? toFloat(row[cOil]) : 0;
    if (!dist && oil > 0) {
      const rate = fuelSettings.rate_km_per_l || 71.4;
      const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
      dist = parseFloat(((oil / price) * rate).toFixed(1));
    }

    const grabVal = cGrab >= 0 && row[cGrab] != null ? toFloat(row[cGrab]) : 0;
    const tipVal = cTip >= 0 && row[cTip] != null ? toFloat(row[cTip]) : 0;
    const tripsVal = cTrips >= 0 && row[cTrips] != null ? Math.round(toFloat(row[cTrips])) || null : null;
    let hoursVal = cHours >= 0 && row[cHours] != null ? toFloat(row[cHours]) || null : null;
    const isWork = grabVal > 0 || tipVal > 0 || (tripsVal != null && tripsVal > 0) || (dist != null && dist > 0) || oil > 0;
    if (isWork && (hoursVal === null || hoursVal === 0)) {
      hoursVal = 3;
    }

    parsed.push({
      id: `entry_${dateStr}_${Math.random().toString(36).slice(2, 6)}`,
      date: dateStr,
      grab: grabVal,
      tip: tipVal,
      trips: tripsVal,
      distance: dist,
      oil,
      oil_real: cOilReal >= 0 && row[cOilReal] != null ? toFloat(row[cOilReal]) : 0,
      credit: cCredit >= 0 && row[cCredit] != null ? toFloat(row[cCredit]) : 0,
      withdraw: cWithdraw >= 0 && row[cWithdraw] != null ? toFloat(row[cWithdraw]) : 0,
      hours: hoursVal,
      note: cNote >= 0 && row[cNote] != null ? String(row[cNote]).trim() : '',
    });
  }

  return parsed;
}
