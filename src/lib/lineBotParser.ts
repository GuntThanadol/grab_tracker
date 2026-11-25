import { ParsedEntryDraft } from '@/lib/lineFlex';
import { shiftDateStr } from '@/lib/supabaseAdmin';
import { parseDurationInput } from '@/lib/utils';

export type BotCommand =
  | { kind: 'query_day'; date: string; label: string }
  | { kind: 'query_week'; offset: 0 | -1 }
  | { kind: 'query_month'; offset: 0 | -1 }
  | { kind: 'query_oil' }
  | { kind: 'query_maintenance' }
  | { kind: 'query_goals' }
  | { kind: 'help' }
  | { kind: 'rest_day'; date: string; note: string }
  | { kind: 'add_field'; field: 'tip' | 'oil_real'; amount: number; date: string }
  | { kind: 'set_goal'; target: 'daily' | 'weekly_trips' | 'monthly'; value: number }
  | { kind: 'reset_maint'; target: 'engine_oil' | 'gear_oil'; odometer: number | null }
  | { kind: 'entry_draft'; draft: ParsedEntryDraft }
  | { kind: 'unknown'; raw: string };

/**
 * Parses flexible date tokens in Thai chat (`วันนี้`, `เมื่อวาน`, `24/11`, `24/11/2026`, `24/11/2569`, `2026-11-24`).
 */
export function parseFlexibleDateToken(text: string, todayStr: string): { date: string; stripped: string } {
  const trimmed = text.trim();

  if (/(?:^|\s)เมื่อวาน(?:\s|$)/.test(trimmed)) {
    return {
      date: shiftDateStr(todayStr, -1),
      stripped: trimmed.replace(/(?:^|\s)เมื่อวาน(?=\s|$)/, ' ').trim(),
    };
  }
  if (/(?:^|\s)วันนี้(?:\s|$)/.test(trimmed)) {
    return {
      date: todayStr,
      stripped: trimmed.replace(/(?:^|\s)วันนี้(?=\s|$)/, ' ').trim(),
    };
  }

  const isoMatch = trimmed.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const date = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    return {
      date,
      stripped: trimmed.replace(isoMatch[0], ' ').trim(),
    };
  }

  const slashMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const dd = Math.min(31, Math.max(1, parseInt(slashMatch[1], 10)));
    const mm = Math.min(12, Math.max(1, parseInt(slashMatch[2], 10)));
    let yyyy = parseInt(todayStr.slice(0, 4), 10);
    if (slashMatch[3]) {
      let rawYear = parseInt(slashMatch[3], 10);
      if (rawYear < 100) rawYear += 2000;
      if (rawYear > 2400) rawYear -= 543;
      yyyy = rawYear;
    }
    const date = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return {
      date,
      stripped: trimmed.replace(slashMatch[0], ' ').trim(),
    };
  }

  return { date: todayStr, stripped: trimmed };
}

/**
 * Parses Thai chat messages into structured bot commands or shorthand daily entry drafts.
 */
export function parseLineCommand(rawText: string, todayStr: string): BotCommand {
  const text = rawText.trim().replace(/\s+/g, ' ');
  if (!text) return { kind: 'help' };

  const lower = text.toLowerCase();

  // 1. Help
  if (/^(ช่วยเหลือ|วิธีใช้|คำสั่ง|เมนู|help|\?)$/i.test(lower)) {
    return { kind: 'help' };
  }

  // 2. Simple queries
  if (/^(วันนี้|ยอดวันนี้|สรุปวันนี้)$/i.test(text)) {
    return { kind: 'query_day', date: todayStr, label: 'วันนี้' };
  }
  if (/^(เมื่อวาน|ยอดเมื่อวาน|สรุปเมื่อวาน)$/i.test(text)) {
    return { kind: 'query_day', date: shiftDateStr(todayStr, -1), label: 'เมื่อวาน' };
  }
  if (/^(ดู|สรุป|วันที่)\s+(.+)$/i.test(text)) {
    const rest = text.replace(/^(ดู|สรุป|วันที่)\s+/i, '');
    const parsed = parseFlexibleDateToken(rest, todayStr);
    if (parsed.date !== todayStr || /วันนี้/.test(rest)) {
      return { kind: 'query_day', date: parsed.date, label: parsed.date };
    }
  }
  if (/^(สัปดาห์นี้|อาทิตย์นี้|สรุปสัปดาห์)$/i.test(text)) {
    return { kind: 'query_week', offset: 0 };
  }
  if (/^(สัปดาห์ก่อน|อาทิตย์ก่อน|สัปดาห์ที่แล้ว|อาทิตย์ที่แล้ว)$/i.test(text)) {
    return { kind: 'query_week', offset: -1 };
  }
  if (/^(เดือนนี้|สรุปเดือน|สรุปเดือนนี้)$/i.test(text)) {
    return { kind: 'query_month', offset: 0 };
  }
  if (/^(เดือนก่อน|เดือนที่แล้ว)$/i.test(text)) {
    return { kind: 'query_month', offset: -1 };
  }
  if (/^(ราคาน้ำมัน|น้ำมัน|เช็คน้ำมัน)$/i.test(text)) {
    return { kind: 'query_oil' };
  }
  if (/^(เช็คระยะ|เช็คระยะรถ|ซ่อมบำรุง|ไมล์รถ|บำรุงรักษา)$/i.test(text)) {
    return { kind: 'query_maintenance' };
  }
  if (/^(เป้าหมาย|เป้า|ดูเป้า)$/i.test(text)) {
    return { kind: 'query_goals' };
  }

  // 3. Rest day command
  if (/^หยุด(\s+.*)?$/i.test(text)) {
    const note = text.replace(/^หยุด\s*/i, '').trim() || 'หยุด';
    return { kind: 'rest_day', date: todayStr, note };
  }

  // 4. Quick incremental additions (`+ทิป 25`, `เติมน้ำมัน 120`)
  const addTipMatch = text.match(/^(?:\+?\s*ทิป|เพิ่มทิป|\+)\s*(\d+(?:\.\d+)?)\s*(?:บาท|฿)?$/i);
  if (addTipMatch) {
    return { kind: 'add_field', field: 'tip', amount: parseFloat(addTipMatch[1]), date: todayStr };
  }

  const addOilMatch = text.match(/^(?:เติมน้ำมันจริง|เติมน้ำมัน|\+?เติมจริง)\s*(\d+(?:\.\d+)?)\s*(?:บาท|฿)?$/i);
  if (addOilMatch) {
    return { kind: 'add_field', field: 'oil_real', amount: parseFloat(addOilMatch[1]), date: todayStr };
  }

  // 5. Goal setters (`ตั้งเป้าวัน 500`, `ตั้งเป้างาน 50`, `ตั้งเป้าเดือน 10000`)
  const goalDayMatch = text.match(/^ตั้งเป้า(?:วัน|รายวัน)\s*(\d+(?:\.\d+)?)/i);
  if (goalDayMatch) {
    return { kind: 'set_goal', target: 'daily', value: parseFloat(goalDayMatch[1]) };
  }
  const goalWeekMatch = text.match(/^ตั้งเป้า(?:งาน|สัปดาห์)\s*(\d+)/i);
  if (goalWeekMatch) {
    return { kind: 'set_goal', target: 'weekly_trips', value: parseInt(goalWeekMatch[1], 10) };
  }
  const goalMonthMatch = text.match(/^ตั้งเป้า(?:เดือน|รายเดือน)\s*(\d+(?:\.\d+)?)/i);
  if (goalMonthMatch) {
    return { kind: 'set_goal', target: 'monthly', value: parseFloat(goalMonthMatch[1]) };
  }

  // 6. Maintenance reset (`ถ่ายน้ำมันเครื่อง`, `ถ่ายน้ำมันเครื่อง 15450`, `ถ่ายเฟืองท้าย`)
  const resetEngineMatch = text.match(/^ถ่ายน้ำมันเครื่อง(?:\s+(\d+(?:\.\d+)?))?/i);
  if (resetEngineMatch) {
    return {
      kind: 'reset_maint',
      target: 'engine_oil',
      odometer: resetEngineMatch[1] ? parseFloat(resetEngineMatch[1]) : null,
    };
  }
  const resetGearMatch = text.match(/^(?:ถ่ายเฟืองท้าย|เปลี่ยนเฟืองท้าย|เปลี่ยนโซ่)(?:\s+(\d+(?:\.\d+)?))?/i);
  if (resetGearMatch) {
    return {
      kind: 'reset_maint',
      target: 'gear_oil',
      odometer: resetGearMatch[1] ? parseFloat(resetGearMatch[1]) : null,
    };
  }

  // 7. Shorthand Work Entry (`450 ทิป 30 งาน 11 ไมล์ 15420 3.5ชม`, `บันทึก ...`)
  const startsWithRecordPrefix = /^(?:บันทึก|ส่งงาน|สรุปงาน)\b/i.test(text);
  const hasDriverKeyword = /(?:ทิป|งาน|รอบ|ไมล์|ระยะ|กม|ชม\.?|ชั่วโมง|นาที|ถอน|เครดิต|เติมจริง|น้ำมัน|โน้ต|หมายเหตุ|\d+:\d+)/i.test(
    text
  );
  const startsWithNumber = /^\d+(?:\.\d+)?\b/.test(text);

  if (startsWithRecordPrefix || (startsWithNumber && hasDriverKeyword)) {
    let working = text.replace(/^(?:บันทึก|ส่งงาน|สรุปงาน)\s*/i, '').trim();

    // Extract note first so numbers inside note aren't parsed as fields
    let note = '';
    const noteMatch = working.match(/(?:โน้ต|หมายเหตุ)\s*[:：]?\s*(.+)$/i);
    if (noteMatch) {
      note = noteMatch[1].trim();
      working = working.slice(0, noteMatch.index).trim();
    }

    const { date, stripped } = parseFlexibleDateToken(working, todayStr);
    working = stripped;

    let tip = 0;
    let trips: number | null = null;
    let odometer: number | null = null;
    let distance: number | null = null;
    let oil: number | null = null;
    let oilReal = 0;
    let withdraw = 0;
    let credit = 0;
    let hours: number | null = null;

    // Extract explicit duration (e.g. `3 ชม 20 นาที`, `3.5ชม`, `3:20`)
    const hmRegex = /(\d+(?:\.\d+)?)\s*(?:ชั่วโมง|ชม\.?)(?:\s*(\d+)\s*(?:นาที|น\.?))?/i;
    const colonRegex = /\b(\d{1,2}:\d{2})\b/;
    const hmMatch = working.match(hmRegex);
    if (hmMatch) {
      hours = parseDurationInput(hmMatch[0]);
      working = working.replace(hmMatch[0], ' ');
    } else {
      const colonMatch = working.match(colonRegex);
      if (colonMatch) {
        hours = parseDurationInput(colonMatch[1]);
        working = working.replace(colonMatch[0], ' ');
      }
    }

    const extractNum = (regex: RegExp): number | null => {
      const m = working.match(regex);
      if (!m) return null;
      const val = parseFloat(m[1]);
      working = working.replace(m[0], ' ');
      return Number.isFinite(val) ? val : null;
    };

    tip = extractNum(/(?:ทิป|tip)\s*(\d+(?:\.\d+)?)/i) ?? 0;
    const parsedTrips = extractNum(/(?:งาน|รอบ|trips?)\s*(\d+)/i);
    if (parsedTrips === null) {
      const suffixTrips = extractNum(/(\d+)\s*(?:งาน|รอบ)/i);
      if (suffixTrips !== null) trips = Math.round(suffixTrips);
    } else {
      trips = Math.round(parsedTrips);
    }

    odometer = extractNum(/(?:ไมล์|เลขไมล์|odo)\s*(\d+(?:\.\d+)?)/i);
    distance = extractNum(/(?:ระยะ|ระยะทาง|dist)\s*(\d+(?:\.\d+)?)/i);
    if (distance === null) {
      distance = extractNum(/(\d+(?:\.\d+)?)\s*(?:กม\.?|km)/i);
    }

    oilReal = extractNum(/(?:เติมจริง|เติมน้ำมัน|oil_real)\s*(\d+(?:\.\d+)?)/i) ?? 0;
    oil = extractNum(/(?:ค่าน้ำมัน|น้ำมัน|oil)\s*(\d+(?:\.\d+)?)/i);
    withdraw = extractNum(/(?:ถอน|withdraw)\s*(\d+(?:\.\d+)?)/i) ?? 0;
    credit = extractNum(/(?:เครดิต|credit)\s*(\d+(?:\.\d+)?)/i) ?? 0;

    // Explicit grab keyword OR leftover leading/first number
    let grab = extractNum(/(?:grab|แกร็บ|ค่ารอบ|ยอด)\s*(\d+(?:\.\d+)?)/i);
    if (grab === null) {
      const firstNum = working.match(/\b(\d+(?:\.\d+)?)\b/);
      if (firstNum) {
        grab = parseFloat(firstNum[1]);
      }
    }

    if (grab !== null || odometer !== null || distance !== null || oilReal > 0) {
      return {
        kind: 'entry_draft',
        draft: {
          date,
          grab: grab ?? 0,
          tip,
          trips,
          odometer,
          distance,
          oil,
          oil_real: oilReal,
          credit,
          withdraw,
          hours,
          note,
        },
      };
    }
  }

  return { kind: 'unknown', raw: text };
}

/**
 * Encodes a ParsedEntryDraft into a compact LINE Postback payload strictly <= 300 characters.
 */
export function encodeDraftPostback(draft: ParsedEntryDraft): string {
  const p = new URLSearchParams();
  p.set('a', 'confirm_save');
  p.set('d', draft.date);
  p.set('g', String(Number(draft.grab.toFixed(2))));
  if (draft.tip > 0) p.set('t', String(Number(draft.tip.toFixed(2))));
  if (draft.trips && draft.trips > 0) p.set('tr', String(Math.round(draft.trips)));
  if (draft.odometer && draft.odometer > 0) p.set('o', String(Number(draft.odometer.toFixed(1))));
  if (draft.distance && draft.distance > 0) p.set('di', String(Number(draft.distance.toFixed(1))));
  if (draft.oil !== null && draft.oil >= 0) p.set('oil', String(Number(draft.oil.toFixed(2))));
  if (draft.oil_real > 0) p.set('or', String(Number(draft.oil_real.toFixed(2))));
  if (draft.credit > 0) p.set('c', String(Number(draft.credit.toFixed(2))));
  if (draft.withdraw > 0) p.set('w', String(Number(draft.withdraw.toFixed(2))));
  if (draft.hours && draft.hours > 0) p.set('h', String(Number(draft.hours.toFixed(2))));

  if (draft.note) {
    let safeNote = draft.note.slice(0, 20);
    p.set('n', safeNote);
    while (p.toString().length > 295 && safeNote.length > 0) {
      safeNote = safeNote.slice(0, -1);
      if (safeNote) p.set('n', safeNote);
      else p.delete('n');
    }
  }

  return p.toString().slice(0, 300);
}

/**
 * Decodes compact Postback URLSearchParams back into a ParsedEntryDraft.
 */
export function decodeDraftPostback(params: URLSearchParams, fallbackDate: string): ParsedEntryDraft {
  const num = (key: string): number => {
    const v = parseFloat(params.get(key) || '');
    return Number.isFinite(v) ? v : 0;
  };
  const optNum = (key: string): number | null => {
    const raw = params.get(key);
    if (!raw) return null;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  };

  return {
    date: params.get('d') || fallbackDate,
    grab: num('g'),
    tip: num('t'),
    trips: optNum('tr') !== null ? Math.round(optNum('tr')!) : null,
    odometer: optNum('o'),
    distance: optNum('di'),
    oil: optNum('oil'),
    oil_real: num('or'),
    credit: num('c'),
    withdraw: num('w'),
    hours: optNum('h'),
    note: params.get('n') || '',
  };
}
