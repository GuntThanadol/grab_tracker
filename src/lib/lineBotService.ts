import { SupabaseClient } from '@supabase/supabase-js';
import { Entry } from '@/types';
import {
  fetchBotSettingsServer,
  fetchFuelSettingsServer,
  getMonthRange,
  getWeekRange,
  upsertBotSettingsServer,
  upsertEntryServer,
} from '@/lib/supabaseAdmin';
import {
  formatThaiMonthTitle,
  generateGoalsFlex,
  generateGrabFlexMessage,
  generateMaintenanceFlex,
  generatePeriodSummaryFlex,
  ParsedEntryDraft,
} from '@/lib/lineFlex';
import { encodeDraftPostback } from '@/lib/lineBotParser';
import { fmtDateSlash, isWorkDay, odometerValue, profit } from '@/lib/utils';

export function resolveAppUrl(origin?: string | null): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl;
  if (origin && origin.startsWith('http')) return `${origin.replace(/\/$/, '')}/`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/`;
  return 'https://grab-tracker-alpha.vercel.app/';
}

export async function getMonthlyProfitForDate(client: SupabaseClient, dateStr: string): Promise<number> {
  const { start, end } = getMonthRange(dateStr, 0);
  const { data } = await client
    .from('entries')
    .select('grab, tip, oil')
    .gte('date', start)
    .lte('date', end);
  if (!data) return 0;
  return data.reduce((sum, row) => sum + profit(row as Entry), 0);
}

export async function getLatestOdometerServer(
  client: SupabaseClient,
  beforeDate?: string
): Promise<{ odometer: number; date: string } | null> {
  let query = client
    .from('entries')
    .select('date, odometer')
    .not('odometer', 'is', null)
    .gt('odometer', 0)
    .order('date', { ascending: false })
    .limit(1);

  if (beforeDate) {
    query = query.lt('date', beforeDate);
  }

  const { data } = await query;
  if (!data || data.length === 0) return null;
  const odo = Number(data[0].odometer);
  if (!Number.isFinite(odo) || odo <= 0) return null;
  return { odometer: Number(odo.toFixed(1)), date: String(data[0].date) };
}

export async function buildDailyReportMessage(
  client: SupabaseClient,
  entry: Entry,
  appUrl: string
) {
  const [{ settings: botSettings }, monthlyProfit] = await Promise.all([
    fetchBotSettingsServer(client),
    getMonthlyProfitForDate(client, entry.date),
  ]);
  return generateGrabFlexMessage(entry, {
    appUrl,
    botSettings,
    monthlyProfit,
    includeQuickActions: entry.id !== 'test_preview',
  });
}

export async function buildPeriodSummaryMessage(
  client: SupabaseClient,
  periodType: 'week' | 'month',
  offset: 0 | -1,
  todayStr: string,
  appUrl: string
) {
  const { settings: botSettings } = await fetchBotSettingsServer(client);

  if (periodType === 'week') {
    const cur = getWeekRange(todayStr, offset);
    const prev = getWeekRange(todayStr, offset - 1);
    const [{ data: curRows }, { data: prevRows }] = await Promise.all([
      client.from('entries').select('*').gte('date', cur.start).lte('date', cur.end).order('date', { ascending: true }),
      client.from('entries').select('*').gte('date', prev.start).lte('date', prev.end),
    ]);

    return generatePeriodSummaryFlex({
      periodType: 'week',
      title: offset === 0 ? 'สรุปยอดสัปดาห์นี้' : 'สรุปยอดสัปดาห์ก่อน',
      subtitle: `${fmtDateSlash(cur.start)} – ${fmtDateSlash(cur.end)}`,
      entries: (curRows || []) as Entry[],
      prevEntries: (prevRows || []) as Entry[],
      botSettings,
      appUrl,
    });
  }

  const cur = getMonthRange(todayStr, offset);
  const prev = getMonthRange(todayStr, offset - 1);
  const [{ data: curRows }, { data: prevRows }] = await Promise.all([
    client.from('entries').select('*').gte('date', cur.start).lte('date', cur.end).order('date', { ascending: true }),
    client.from('entries').select('*').gte('date', prev.start).lte('date', prev.end),
  ]);

  return generatePeriodSummaryFlex({
    periodType: 'month',
    title: `สรุปเดือน ${formatThaiMonthTitle(cur.monthKey)}`,
    subtitle: `${fmtDateSlash(cur.start)} – ${fmtDateSlash(cur.end)}`,
    entries: (curRows || []) as Entry[],
    prevEntries: (prevRows || []) as Entry[],
    botSettings,
    appUrl,
  });
}

export async function buildGoalsMessage(client: SupabaseClient, todayStr: string) {
  const { settings: botSettings } = await fetchBotSettingsServer(client);
  const week = getWeekRange(todayStr, 0);
  const month = getMonthRange(todayStr, 0);

  const [{ data: todayRow }, { data: weekRows }, { data: monthRows }] = await Promise.all([
    client.from('entries').select('*').eq('date', todayStr).maybeSingle(),
    client.from('entries').select('*').gte('date', week.start).lte('date', week.end),
    client.from('entries').select('grab, tip, oil').gte('date', month.start).lte('date', month.end),
  ]);

  const todayProfit = todayRow ? profit(todayRow as Entry) : 0;
  const weekTrips = (weekRows || []).reduce((sum, r) => {
    const row = r as Entry;
    return sum + (Number(row.trips) || 0);
  }, 0);
  const monthProfit = (monthRows || []).reduce((sum, r) => sum + profit(r as Entry), 0);

  return generateGoalsFlex(todayProfit, weekTrips, monthProfit, botSettings);
}

export async function buildMaintenanceMessage(client: SupabaseClient, todayStr: string) {
  const [{ settings: botSettings }, latestOdo] = await Promise.all([
    fetchBotSettingsServer(client),
    getLatestOdometerServer(client),
  ]);
  return generateMaintenanceFlex(
    latestOdo?.odometer ?? null,
    latestOdo?.date ?? null,
    botSettings,
    todayStr
  );
}

export async function prepareEntryDraft(client: SupabaseClient, rawDraft: ParsedEntryDraft) {
  const draft: ParsedEntryDraft = { ...rawDraft };
  const [prevOdoInfo, fuelSettings, existingRes] = await Promise.all([
    getLatestOdometerServer(client, draft.date),
    fetchFuelSettingsServer(client),
    client.from('entries').select('id').eq('date', draft.date).maybeSingle(),
  ]);

  if (draft.odometer && prevOdoInfo && draft.odometer >= prevOdoInfo.odometer && !draft.distance) {
    draft.distance = Number((draft.odometer - prevOdoInfo.odometer).toFixed(1));
  }

  if (draft.distance && draft.distance > 0 && draft.oil === null) {
    const price = fuelSettings.manual_price || fuelSettings.last_fetched_price || 39.09;
    const rate = fuelSettings.rate_km_per_l || 71.4;
    draft.oil = Number(((draft.distance / rate) * price).toFixed(2));
  } else if (draft.oil === null) {
    draft.oil = 0;
  }

  // Save full draft in bot_settings if table exists (preserves long notes beyond 300-char postback limit)
  await upsertBotSettingsServer(client, { pending_draft: draft as unknown as Record<string, unknown> });

  return {
    draft,
    prevOdoInfo,
    isExistingDate: Boolean(existingRes.data),
    confirmData: encodeDraftPostback(draft),
  };
}

export async function commitEntryDraft(client: SupabaseClient, draft: ParsedEntryDraft) {
  const id = Date.now() + Math.random().toString(36).slice(2, 6);
  const candidate: Entry = {
    id,
    date: draft.date,
    grab: Number(draft.grab) || 0,
    tip: Number(draft.tip) || 0,
    trips: draft.trips && draft.trips > 0 ? Math.round(draft.trips) : null,
    odometer: draft.odometer && draft.odometer > 0 ? Number(draft.odometer.toFixed(1)) : null,
    distance: draft.distance && draft.distance > 0 ? Number(draft.distance.toFixed(2)) : null,
    oil: Number(draft.oil) || 0,
    oil_real: Number(draft.oil_real) || 0,
    credit: Number(draft.credit) || 0,
    withdraw: Number(draft.withdraw) || 0,
    hours: draft.hours && draft.hours > 0 ? Number(draft.hours.toFixed(2)) : null,
    note: (draft.note || '').trim(),
  };

  if (candidate.hours === null && isWorkDay(candidate)) {
    candidate.hours = 3;
  }

  const res = await upsertEntryServer(client, candidate);
  await upsertBotSettingsServer(client, { pending_draft: null });
  return res;
}

export function extractLatestOdometerFromEntry(entry: Entry): number | null {
  return odometerValue(entry);
}
