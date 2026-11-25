import { BotSettings, Entry, FuelSettings } from '@/types';
import {
  fmt,
  fmtInt,
  fmtDateSlash,
  fmtDateTh,
  income,
  profit,
  tripsCount,
  odometerValue,
  formatDuration,
  isWorkDay,
  TH_MONTHS,
} from '@/lib/utils';
import { FuelPriceResponse } from '@/lib/oilPrice';

const DEFAULT_APP_URL = 'https://grab-tracker-alpha.vercel.app/';

export interface DailyFlexOptions {
  appUrl?: string;
  botSettings?: BotSettings;
  monthlyProfit?: number;
  includeQuickActions?: boolean;
}

export interface ParsedEntryDraft {
  date: string;
  grab: number;
  tip: number;
  trips: number | null;
  odometer: number | null;
  distance: number | null;
  oil: number | null;
  oil_real: number;
  credit: number;
  withdraw: number;
  hours: number | null;
  note: string;
}

export interface MaintenanceAlertSummary {
  hasWarning: boolean;
  messages: string[];
  engineUsedKm: number | null;
  engineRemainingKm: number | null;
  gearUsedKm: number | null;
  gearRemainingKm: number | null;
  taxDaysLeft: number | null;
}

function buildRow(
  label: string,
  value: string,
  valueColor = '#0f172a',
  labelColor = '#64748b',
  boldValue = true,
  margin?: string
): Record<string, unknown> {
  return {
    type: 'box',
    layout: 'horizontal',
    ...(margin ? { margin } : {}),
    contents: [
      { type: 'text', text: label, size: 'sm', color: labelColor, flex: 5 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: valueColor,
        weight: boldValue ? 'bold' : 'regular',
        align: 'end',
        flex: 5,
      },
    ],
  };
}

/**
 * Builds a LINE Flex horizontal progress bar without ever passing empty `contents: []`.
 */
function buildProgressBar(pct: number, fillColor: string, trackColor = '#e2e8f0'): Record<string, unknown> {
  const clamped = Math.max(0, Math.min(100, pct));
  const trackContents: Record<string, unknown>[] =
    clamped > 0
      ? [
          {
            type: 'box',
            layout: 'vertical',
            width: `${Math.max(4, Math.round(clamped))}%`,
            height: '8px',
            backgroundColor: fillColor,
            cornerRadius: '4px',
            contents: [{ type: 'filler' }],
          },
        ]
      : [{ type: 'filler' }];

  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor: trackColor,
    height: '8px',
    cornerRadius: '4px',
    margin: 'xs',
    contents: trackContents,
  };
}

/**
 * Evaluates maintenance intervals & tax countdown against latest odometer and today's Bangkok date.
 */
export function evaluateMaintenance(
  latestOdo: number | null,
  botSettings: BotSettings,
  todayStr: string
): MaintenanceAlertSummary {
  const messages: string[] = [];
  let engineUsedKm: number | null = null;
  let engineRemainingKm: number | null = null;
  let gearUsedKm: number | null = null;
  let gearRemainingKm: number | null = null;
  let taxDaysLeft: number | null = null;

  if (latestOdo && latestOdo > 0 && botSettings.last_engine_oil_odo > 0) {
    engineUsedKm = Math.max(0, Number((latestOdo - botSettings.last_engine_oil_odo).toFixed(1)));
    engineRemainingKm = Number((botSettings.engine_oil_interval_km - engineUsedKm).toFixed(1));
    if (engineRemainingKm <= 0) {
      messages.push(`🛢️ น้ำมันเครื่องเลยกำหนด ${Math.abs(engineRemainingKm).toFixed(0)} กม.`);
    } else if (engineRemainingKm <= 150) {
      messages.push(`🛢️ น้ำมันเครื่องเหลืออีก ${engineRemainingKm.toFixed(0)} กม.`);
    }
  }

  if (latestOdo && latestOdo > 0 && botSettings.last_gear_oil_odo > 0) {
    gearUsedKm = Math.max(0, Number((latestOdo - botSettings.last_gear_oil_odo).toFixed(1)));
    gearRemainingKm = Number((botSettings.gear_oil_interval_km - gearUsedKm).toFixed(1));
    if (gearRemainingKm <= 0) {
      messages.push(`⚙️ น้ำมันเฟืองท้ายเลยกำหนด ${Math.abs(gearRemainingKm).toFixed(0)} กม.`);
    } else if (gearRemainingKm <= 200) {
      messages.push(`⚙️ น้ำมันเฟืองท้ายเหลืออีก ${gearRemainingKm.toFixed(0)} กม.`);
    }
  }

  if (botSettings.tax_expire_date) {
    const [ty, tm, td] = todayStr.slice(0, 10).split('-').map(Number);
    const [xy, xm, xd] = botSettings.tax_expire_date.slice(0, 10).split('-').map(Number);
    if (ty && xy) {
      const todayMs = Date.UTC(ty, tm - 1, td);
      const expMs = Date.UTC(xy, xm - 1, xd);
      taxDaysLeft = Math.round((expMs - todayMs) / 86400000);
      if (taxDaysLeft < 0) {
        messages.push(`📄 พ.ร.บ./ภาษี หมดอายุแล้ว ${Math.abs(taxDaysLeft)} วัน`);
      } else if (taxDaysLeft <= 14) {
        messages.push(`📄 พ.ร.บ./ภาษี เหลืออีก ${taxDaysLeft} วัน`);
      }
    }
  }

  return {
    hasWarning: messages.length > 0,
    messages,
    engineUsedKm,
    engineRemainingKm,
    gearUsedKm,
    gearRemainingKm,
    taxDaysLeft,
  };
}

/**
 * Generate a beautiful LINE Flex Message for daily Grab report (backward-compatible signature).
 */
export function generateGrabFlexMessage(
  entry: Entry,
  appUrlOrOpts: string | DailyFlexOptions = DEFAULT_APP_URL
) {
  const opts: DailyFlexOptions =
    typeof appUrlOrOpts === 'string' ? { appUrl: appUrlOrOpts } : appUrlOrOpts || {};
  const appUrl = opts.appUrl || DEFAULT_APP_URL;
  const botSettings = opts.botSettings;
  const includeQuickActions = opts.includeQuickActions !== false;

  const inc = income(entry);
  const p = profit(entry);
  const trips = tripsCount(entry);
  const odo = odometerValue(entry);
  const dist = entry.distance ? parseFloat(entry.distance.toString()) : 0;
  const hours = entry.hours ? parseFloat(entry.hours.toString()) : 0;
  const avgPerHour = hours > 0 ? (inc / hours).toFixed(2) : null;
  const avgPerKm = dist > 0 ? (inc / dist).toFixed(2) : null;

  const isPositiveProfit = p >= 0;
  const profitColor = isPositiveProfit ? '#00b14f' : '#ef4444';
  const profitSign = isPositiveProfit ? '+' : '';

  const detailRows: Record<string, unknown>[] = [
    buildRow('📦 จำนวนงานที่วิ่ง', trips > 0 ? `${trips} งาน` : '—', '#6d28d9'),
    buildRow('🛵 ค่ารอบ Grab', `${fmt(entry.grab)} ฿`, '#0f172a'),
    buildRow('🎁 ทิปมือ', `${fmt(entry.tip)} ฿`, '#0f172a'),
    buildRow('💰 รวมรายรับ', `${fmt(inc)} ฿`, '#00b14f', '#00b14f'),
    { type: 'separator', margin: 'md', color: '#e2e8f0' },
  ];

  if (odo !== null && odo > 0) {
    detailRows.push(buildRow('📟 เลขไมล์หน้าปัด', `${odo.toLocaleString('th-TH')} กม.`, '#0f172a', '#64748b', true, 'md'));
  }

  detailRows.push(
    buildRow(
      '📍 ระยะทางวิ่ง',
      dist > 0 ? `${dist.toFixed(1)} กม.` : '—',
      '#2563eb',
      '#64748b',
      true,
      odo !== null && odo > 0 ? undefined : 'md'
    )
  );
  detailRows.push(buildRow('⛽ ค่าน้ำมัน (ประมาณ)', `${fmt(entry.oil)} ฿`, '#e11d48'));

  if (Number(entry.oil_real) > 0) {
    detailRows.push(buildRow('⛽ เติมน้ำมันจริง', `${fmt(entry.oil_real)} ฿`, '#475569'));
  }

  detailRows.push(buildRow('⏱️ ชั่วโมงวิ่งงาน', hours > 0 ? formatDuration(hours, 'full') : '—', '#0f172a'));

  if (avgPerHour || avgPerKm) {
    detailRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '⚡ รายได้เฉลี่ย', size: 'sm', color: '#64748b', flex: 4 },
        {
          type: 'text',
          text: `${avgPerHour ? `${avgPerHour} ฿/ชม.` : ''}${avgPerHour && avgPerKm ? ' • ' : ''}${avgPerKm ? `${avgPerKm} ฿/กม.` : ''}`,
          size: 'xs',
          color: '#64748b',
          align: 'end',
          flex: 6,
        },
      ],
    });
  }

  if (Number(entry.withdraw) > 0) {
    detailRows.push(buildRow('🏦 ถอนเข้ากรุงศรี', `${fmt(entry.withdraw)} ฿`, '#0f172a'));
  }

  if (Number(entry.credit) > 0) {
    detailRows.push(buildRow('💳 เติมเครดิต Grab', `${fmt(entry.credit)} ฿`, '#0f172a'));
  }

  if (entry.note && entry.note.trim()) {
    detailRows.push({ type: 'separator', margin: 'md', color: '#e2e8f0' });
    detailRows.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        { type: 'text', text: '📝 หมายเหตุ:', size: 'xs', color: '#94a3b8', weight: 'bold' },
        { type: 'text', text: entry.note, size: 'xs', color: '#475569', wrap: true, margin: 'xs' },
      ],
    });
  }

  const bodyContents: Record<string, unknown>[] = [
    {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#ffffff',
      cornerRadius: '16px',
      paddingAll: '16px',
      borderColor: '#e2e8f0',
      borderWidth: '1px',
      contents: [
        {
          type: 'text',
          text: 'กำไรสุทธิวันนี้ (Net Profit)',
          size: 'xs',
          color: '#64748b',
          align: 'center',
          weight: 'bold',
        },
        {
          type: 'text',
          text: `${profitSign}${fmt(p)} ฿`,
          size: '3xl',
          color: profitColor,
          weight: 'bold',
          align: 'center',
          margin: 'sm',
        },
        {
          type: 'text',
          text: isPositiveProfit ? '🎉 ยอดเยี่ยม! หักค่าน้ำมันแล้ว' : '⚠️ ติดลบหรือไม่มีรายได้',
          size: 'xxs',
          color: '#94a3b8',
          align: 'center',
          margin: 'xs',
        },
      ],
    },
  ];

  // Goal Progress Box (Phase 3)
  if (botSettings && botSettings.daily_goal > 0) {
    const dailyPct = Math.max(0, Math.round((p / botSettings.daily_goal) * 100));
    const dailyRemaining = Math.max(0, botSettings.daily_goal - p);
    const goalReached = p >= botSettings.daily_goal;

    const goalChildren: Record<string, unknown>[] = [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `🎯 เป้าวันนี้ (${fmtInt(botSettings.daily_goal)} ฿)`,
            size: 'xs',
            color: '#475569',
            weight: 'bold',
            flex: 7,
          },
          {
            type: 'text',
            text: goalReached ? `ครบเป้า! (${dailyPct}%)` : `${dailyPct}%`,
            size: 'xs',
            color: goalReached ? '#00b14f' : '#2563eb',
            weight: 'bold',
            align: 'end',
            flex: 3,
          },
        ],
      },
      buildProgressBar(dailyPct, goalReached ? '#00b14f' : '#3b82f6'),
    ];

    if (!goalReached && p > 0) {
      goalChildren.push({
        type: 'text',
        text: `ขาดอีก ${fmt(dailyRemaining)} ฿ ถึงเป้ารายวัน`,
        size: 'xxs',
        color: '#94a3b8',
        margin: 'xs',
      });
    }

    if (opts.monthlyProfit !== undefined && botSettings.monthly_goal > 0) {
      const mPct = Math.max(0, Math.round((opts.monthlyProfit / botSettings.monthly_goal) * 100));
      goalChildren.push({
        type: 'text',
        text: `🗓️ สะสมเดือนนี้ ${fmt(opts.monthlyProfit)} / ${fmtInt(botSettings.monthly_goal)} ฿ (${mPct}%)`,
        size: 'xxs',
        color: '#64748b',
        margin: 'sm',
      });
    }

    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      backgroundColor: '#ffffff',
      cornerRadius: '14px',
      paddingAll: '12px',
      borderColor: '#e2e8f0',
      borderWidth: '1px',
      contents: goalChildren,
    });
  }

  // Maintenance warning banner if odometer triggers threshold
  if (botSettings) {
    const maint = evaluateMaintenance(odo, botSettings, entry.date);
    if (maint.hasWarning) {
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        backgroundColor: '#fffbeb',
        cornerRadius: '12px',
        paddingAll: '12px',
        borderColor: '#fcd34d',
        borderWidth: '1px',
        contents: [
          { type: 'text', text: '⚠️ แจ้งเตือนดูแลรักษารถ', size: 'xs', color: '#b45309', weight: 'bold' },
          ...maint.messages.map((m) => ({
            type: 'text',
            text: `• ${m}`,
            size: 'xs',
            color: '#92400e',
            wrap: true,
            margin: 'xs',
          })),
        ],
      });
    }
  }

  bodyContents.push({
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    spacing: 'sm',
    backgroundColor: '#ffffff',
    cornerRadius: '16px',
    paddingAll: '16px',
    borderColor: '#e2e8f0',
    borderWidth: '1px',
    contents: detailRows,
  });

  const footerContents: Record<string, unknown>[] = [];
  if (includeQuickActions && entry.id !== 'test_preview') {
    footerContents.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      margin: 'none',
      contents: [
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '+ทิป 20฿',
            data: `a=add_tip&d=${entry.date}&v=20`,
            displayText: '+ทิป 20 บาท',
          },
          style: 'secondary',
          height: 'sm',
          flex: 1,
        },
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '⛽ +เติม 100฿',
            data: `a=add_oil_real&d=${entry.date}&v=100`,
            displayText: 'เติมน้ำมันจริง +100 บาท',
          },
          style: 'secondary',
          height: 'sm',
          flex: 1,
        },
      ],
    });
  }

  footerContents.push({
    type: 'button',
    action: {
      type: 'uri',
      label: '📊 เปิดดูระบบ Grab Tracker',
      uri: appUrl,
    },
    style: 'primary',
    color: '#00b14f',
    height: 'sm',
    ...(footerContents.length > 0 ? { margin: 'sm' } : {}),
  });

  return {
    type: 'flex',
    altText: `🚗 สรุปรายได้ Grab วันที่ ${fmtDateSlash(entry.date)}: กำไรสุทธิ ${fmt(p)} บาท`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00b14f',
        paddingTop: '16px',
        paddingBottom: '16px',
        paddingStart: '20px',
        paddingEnd: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'GRAB TRACKER', color: '#ffffff', weight: 'bold', size: 'xs' },
              {
                type: 'text',
                text: 'DAILY REPORT',
                color: '#bbf7d0',
                size: 'xxs',
                align: 'end',
                weight: 'bold',
              },
            ],
          },
          {
            type: 'text',
            text: `สรุปงาน ${fmtDateTh(entry.date)}`,
            color: '#ffffff',
            weight: 'bold',
            size: 'lg',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '20px',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingStart: '20px',
        paddingEnd: '20px',
        paddingBottom: '16px',
        contents: footerContents,
      },
      styles: {
        footer: {
          separator: false,
        },
      },
    },
  };
}

export interface PeriodSummaryParams {
  periodType: 'week' | 'month';
  title: string;
  subtitle: string;
  entries: Entry[];
  prevEntries?: Entry[];
  botSettings?: BotSettings;
  appUrl?: string;
}

/**
 * Generates Weekly or Monthly Summary Flex Card with goal bars & comparison vs previous period.
 */
export function generatePeriodSummaryFlex(params: PeriodSummaryParams) {
  const { periodType, title, subtitle, entries, prevEntries = [], botSettings, appUrl = DEFAULT_APP_URL } = params;

  const workRows = entries.filter(isWorkDay);
  const restDays = entries.length - workRows.length;
  const totalGrab = entries.reduce((s, r) => s + (Number(r.grab) || 0), 0);
  const totalTip = entries.reduce((s, r) => s + (Number(r.tip) || 0), 0);
  const totalInc = entries.reduce((s, r) => s + income(r), 0);
  const totalTrips = entries.reduce((s, r) => s + tripsCount(r), 0);
  const totalOil = entries.reduce((s, r) => s + (Number(r.oil) || 0), 0);
  const totalOilReal = entries.reduce((s, r) => s + (Number(r.oil_real) || 0), 0);
  const totalDist = entries.reduce((s, r) => s + (Number(r.distance) || 0), 0);
  const totalHours = entries.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const totalWithdraw = entries.reduce((s, r) => s + (Number(r.withdraw) || 0), 0);
  const totalProfit = entries.reduce((s, r) => s + profit(r), 0);

  const prevProfit = prevEntries.reduce((s, r) => s + profit(r), 0);
  let compareText = '';
  if (prevEntries.length > 0 && prevProfit > 0) {
    const diffPct = ((totalProfit - prevProfit) / prevProfit) * 100;
    const sign = diffPct >= 0 ? '+' : '';
    compareText = `${diffPct >= 0 ? '📈' : '📉'} เทียบช่วงก่อน: ${sign}${diffPct.toFixed(1)}%`;
  }

  const avgProfitPerDay = workRows.length > 0 ? totalProfit / workRows.length : 0;
  const avgPerHour = totalHours > 0 ? totalInc / totalHours : 0;
  const avgPerKm = totalDist > 0 ? totalInc / totalDist : 0;

  let bestDay: Entry | null = null;
  for (const r of workRows) {
    if (!bestDay || profit(r) > profit(bestDay)) bestDay = r;
  }

  const bodyContents: Record<string, unknown>[] = [
    {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#ffffff',
      cornerRadius: '16px',
      paddingAll: '16px',
      borderColor: '#e2e8f0',
      borderWidth: '1px',
      contents: [
        {
          type: 'text',
          text: periodType === 'week' ? 'กำไรสุทธิรายสัปดาห์' : 'กำไรสุทธิรายเดือน',
          size: 'xs',
          color: '#64748b',
          align: 'center',
          weight: 'bold',
        },
        {
          type: 'text',
          text: `${totalProfit >= 0 ? '+' : ''}${fmt(totalProfit)} ฿`,
          size: '3xl',
          color: totalProfit >= 0 ? '#00b14f' : '#ef4444',
          weight: 'bold',
          align: 'center',
          margin: 'sm',
        },
        {
          type: 'text',
          text: `วิ่ง ${workRows.length} วัน • หยุด ${restDays} วัน • เฉลี่ย ${fmt(avgProfitPerDay)} ฿/วัน`,
          size: 'xxs',
          color: '#64748b',
          align: 'center',
          margin: 'xs',
        },
        ...(compareText
          ? [
              {
                type: 'text',
                text: compareText,
                size: 'xs',
                color: totalProfit >= prevProfit ? '#059669' : '#e11d48',
                weight: 'bold',
                align: 'center',
                margin: 'xs',
              },
            ]
          : []),
      ],
    },
  ];

  // Goal progress box for week (trips incentive) or month (monthly profit)
  if (botSettings) {
    if (periodType === 'week' && botSettings.weekly_trips_goal > 0) {
      const pct = Math.round((totalTrips / botSettings.weekly_trips_goal) * 100);
      const reached = totalTrips >= botSettings.weekly_trips_goal;
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        backgroundColor: '#ffffff',
        cornerRadius: '14px',
        paddingAll: '12px',
        borderColor: '#e2e8f0',
        borderWidth: '1px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `🏆 เป้างานสัปดาห์ (${totalTrips}/${botSettings.weekly_trips_goal} งาน)`,
                size: 'xs',
                color: '#475569',
                weight: 'bold',
                flex: 7,
              },
              {
                type: 'text',
                text: `${pct}%`,
                size: 'xs',
                color: reached ? '#00b14f' : '#7c3aed',
                weight: 'bold',
                align: 'end',
                flex: 3,
              },
            ],
          },
          buildProgressBar(pct, reached ? '#00b14f' : '#7c3aed'),
          {
            type: 'text',
            text: reached
              ? '🎉 ครบเป้าจำนวนงานสัปดาห์แล้ว!'
              : `เหลืออีก ${botSettings.weekly_trips_goal - totalTrips} งานครบเป้า`,
            size: 'xxs',
            color: '#64748b',
            margin: 'xs',
          },
        ],
      });
    } else if (periodType === 'month' && botSettings.monthly_goal > 0) {
      const pct = Math.round((totalProfit / botSettings.monthly_goal) * 100);
      const reached = totalProfit >= botSettings.monthly_goal;
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        backgroundColor: '#ffffff',
        cornerRadius: '14px',
        paddingAll: '12px',
        borderColor: '#e2e8f0',
        borderWidth: '1px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `🎯 เป้าเดือนนี้ (${fmtInt(botSettings.monthly_goal)} ฿)`,
                size: 'xs',
                color: '#475569',
                weight: 'bold',
                flex: 7,
              },
              {
                type: 'text',
                text: `${pct}%`,
                size: 'xs',
                color: reached ? '#00b14f' : '#2563eb',
                weight: 'bold',
                align: 'end',
                flex: 3,
              },
            ],
          },
          buildProgressBar(pct, reached ? '#00b14f' : '#2563eb'),
          {
            type: 'text',
            text: reached
              ? '🎉 ทะลุเป้ารายเดือนแล้ว!'
              : `ขาดอีก ${fmt(botSettings.monthly_goal - totalProfit)} ฿ ถึงเป้ารายเดือน`,
            size: 'xxs',
            color: '#64748b',
            margin: 'xs',
          },
        ],
      });
    }
  }

  const rows: Record<string, unknown>[] = [
    buildRow('📦 จำนวนงานรวม', `${fmtInt(totalTrips)} งาน`, '#6d28d9'),
    buildRow('🛵 ค่ารอบ Grab', `${fmt(totalGrab)} ฿`, '#0f172a'),
    buildRow('🎁 ทิปมือรวม', `${fmt(totalTip)} ฿`, '#0f172a'),
    buildRow('💰 รายรับรวม', `${fmt(totalInc)} ฿`, '#00b14f', '#00b14f'),
    { type: 'separator', margin: 'md', color: '#e2e8f0' },
    buildRow('📍 ระยะทางรวม', `${totalDist.toFixed(1)} กม.`, '#2563eb', '#64748b', true, 'md'),
    buildRow('⛽ น้ำมัน (ประมาณ)', `${fmt(totalOil)} ฿`, '#e11d48'),
    buildRow('⛽ เติมน้ำมันจริง', `${fmt(totalOilReal)} ฿`, '#475569'),
    buildRow('⏱️ ชั่วโมงวิ่งรวม', totalHours > 0 ? formatDuration(totalHours, 'short') : '—', '#0f172a'),
    buildRow(
      '⚡ เฉลี่ยความคุ้มค่า',
      `${avgPerHour > 0 ? `${avgPerHour.toFixed(0)} ฿/ชม.` : '—'} • ${avgPerKm > 0 ? `${avgPerKm.toFixed(1)} ฿/กม.` : '—'}`,
      '#475569',
      '#64748b',
      false
    ),
    buildRow('🏦 ถอนเข้าบัญชีรวม', `${fmt(totalWithdraw)} ฿`, '#0284c7'),
  ];

  if (bestDay) {
    rows.push({ type: 'separator', margin: 'md', color: '#e2e8f0' });
    rows.push(
      buildRow(
        '🌟 วันที่กำไรสูงสุด',
        `${fmtDateSlash(bestDay.date)} (${fmt(profit(bestDay))} ฿)`,
        '#059669',
        '#64748b',
        true,
        'md'
      )
    );
  }

  bodyContents.push({
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    spacing: 'sm',
    backgroundColor: '#ffffff',
    cornerRadius: '16px',
    paddingAll: '16px',
    borderColor: '#e2e8f0',
    borderWidth: '1px',
    contents: rows,
  });

  const headerColor = periodType === 'week' ? '#0284c7' : '#4f46e5';

  return {
    type: 'flex',
    altText: `📊 ${title}: กำไรสุทธิ ${fmt(totalProfit)} ฿ (${totalTrips} งาน)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerColor,
        paddingAll: '18px',
        contents: [
          {
            type: 'text',
            text: periodType === 'week' ? 'GRAB WEEKLY SUMMARY' : 'GRAB MONTHLY SUMMARY',
            color: '#e0f2fe',
            size: 'xxs',
            weight: 'bold',
          },
          {
            type: 'text',
            text: title,
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs',
          },
          {
            type: 'text',
            text: subtitle,
            color: '#e0f2fe',
            size: 'xs',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '18px',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingStart: '18px',
        paddingEnd: '18px',
        paddingBottom: '16px',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '📊 เปิดดูกราฟในเว็บ', uri: appUrl },
            style: 'primary',
            color: headerColor,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * Generates a Preview & Confirmation Flex Card before writing a chat-parsed entry to Supabase.
 */
export function generateEntryPreviewFlex(
  draft: ParsedEntryDraft,
  prevOdoInfo: { odometer: number; date: string } | null,
  isExistingDate: boolean,
  confirmPostbackData: string
) {
  const inc = draft.grab + draft.tip;
  const estOil = draft.oil ?? 0;
  const netProfit = inc - estOil;

  const rows: Record<string, unknown>[] = [
    buildRow('📅 วันที่บันทึก', fmtDateTh(draft.date), '#0f172a'),
    buildRow('🛵 ค่ารอบ Grab', `${fmt(draft.grab)} ฿`, '#0f172a'),
    buildRow('🎁 ทิปมือ', `${fmt(draft.tip)} ฿`, '#0f172a'),
    buildRow('📦 จำนวนงาน', draft.trips ? `${draft.trips} งาน` : '—', '#6d28d9'),
  ];

  if (draft.odometer) {
    rows.push(buildRow('📟 เลขไมล์วันนี้', `${draft.odometer.toLocaleString('th-TH')} กม.`, '#0f172a'));
    if (prevOdoInfo) {
      rows.push(
        buildRow(
          '⏮️ ไมล์ก่อนหน้า',
          `${prevOdoInfo.odometer.toLocaleString('th-TH')} กม. (${fmtDateSlash(prevOdoInfo.date)})`,
          '#64748b',
          '#64748b',
          false
        )
      );
    }
  }

  rows.push(buildRow('📍 ระยะทางคำนวณ', draft.distance ? `${draft.distance.toFixed(1)} กม.` : '—', '#2563eb'));
  rows.push(buildRow('⛽ ค่าน้ำมัน (ประมาณ)', `${fmt(estOil)} ฿`, '#e11d48'));

  if (draft.oil_real > 0) {
    rows.push(buildRow('⛽ เติมน้ำมันจริง', `${fmt(draft.oil_real)} ฿`, '#475569'));
  }
  if (draft.hours) {
    rows.push(buildRow('⏱️ ชั่วโมงวิ่งงาน', formatDuration(draft.hours, 'full'), '#0f172a'));
  }
  if (draft.withdraw > 0) {
    rows.push(buildRow('🏦 ถอนเข้าบัญชี', `${fmt(draft.withdraw)} ฿`, '#0284c7'));
  }
  if (draft.credit > 0) {
    rows.push(buildRow('💳 เติมเครดิต', `${fmt(draft.credit)} ฿`, '#0f172a'));
  }
  if (draft.note) {
    rows.push(buildRow('📝 หมายเหตุ', draft.note, '#475569', '#64748b', false));
  }

  return {
    type: 'flex',
    altText: `📝 พรีวิวก่อนบันทึก ${fmtDateSlash(draft.date)}: กำไร ${fmt(netProfit)} ฿`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f172a',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'CONFIRM ENTRY', color: '#34d399', size: 'xxs', weight: 'bold' },
          {
            type: 'text',
            text: '📝 ตรวจสอบข้อมูลก่อนบันทึก',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
            margin: 'xs',
          },
          ...(isExistingDate
            ? [
                {
                  type: 'text',
                  text: '⚠️ วันนี้มีข้อมูลอยู่แล้ว การบันทึกจะอัปเดตทับข้อมูลเดิม',
                  color: '#fbbf24',
                  size: 'xs',
                  wrap: true,
                  margin: 'xs',
                },
              ]
            : []),
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              { type: 'text', text: 'กำไรสุทธิโดยประมาณ', size: 'xs', color: '#64748b', align: 'center' },
              {
                type: 'text',
                text: `${netProfit >= 0 ? '+' : ''}${fmt(netProfit)} ฿`,
                size: '2xl',
                color: netProfit >= 0 ? '#00b14f' : '#ef4444',
                weight: 'bold',
                align: 'center',
                margin: 'xs',
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: rows,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        backgroundColor: '#f8fafc',
        paddingStart: '18px',
        paddingEnd: '18px',
        paddingBottom: '16px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '❌ ยกเลิก',
              data: 'a=cancel',
              displayText: '❌ ยกเลิกการบันทึก',
            },
            style: 'secondary',
            height: 'sm',
            flex: 2,
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ ยืนยันบันทึก',
              data: confirmPostbackData,
              displayText: '✅ ยืนยันบันทึกข้อมูล',
            },
            style: 'primary',
            color: '#00b14f',
            height: 'sm',
            flex: 3,
          },
        ],
      },
    },
  };
}

/**
 * Generates a Live Fuel Price Flex Card (Bangchak / PTT + tomorrow alert if changed).
 */
export function generateFuelPriceFlex(fuelData: FuelPriceResponse, fuelSettings: FuelSettings) {
  const brandLabel = fuelData.brand === 'ptt' ? 'ปตท. (PTT)' : 'บางจาก (Bangchak)';
  const rate = fuelSettings.rate_km_per_l || 71.4;
  const activeKey = fuelSettings.fuel_type || 'gasohol_95';
  const activePrice = fuelSettings.manual_price || fuelData.prices[activeKey] || fuelSettings.last_fetched_price || 39.09;
  const costPerKm = activePrice / rate;

  const fuelLabels: Array<{ key: keyof FuelPriceResponse['prices']; name: string }> = [
    { key: 'gasohol_95', name: 'แก๊สโซฮอล์ 95' },
    { key: 'gasohol_91', name: 'แก๊สโซฮอล์ 91' },
    { key: 'gasohol_e20', name: 'แก๊สโซฮอล์ E20' },
    { key: 'diesel', name: 'ดีเซล' },
  ];

  const rows: Record<string, unknown>[] = fuelLabels.map(({ key, name }) => {
    const val = fuelData.prices[key];
    const diff = fuelData.diffs?.[key];
    const isActive = key === activeKey;
    const diffStr = diff && diff !== 0 ? ` (${diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)})` : '';
    return buildRow(
      `${isActive ? '👉 ' : ''}${name}`,
      val ? `${val.toFixed(2)} ฿${diffStr}` : '—',
      isActive ? '#00b14f' : '#0f172a',
      isActive ? '#00b14f' : '#64748b'
    );
  });

  const activeDiff = fuelData.diffs?.[activeKey] || 0;
  const alertBanner: Record<string, unknown>[] =
    activeDiff !== 0
      ? [
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            backgroundColor: activeDiff > 0 ? '#fef2f2' : '#ecfdf5',
            cornerRadius: '12px',
            paddingAll: '12px',
            borderColor: activeDiff > 0 ? '#fecaca' : '#a7f3d0',
            borderWidth: '1px',
            contents: [
              {
                type: 'text',
                text:
                  activeDiff > 0
                    ? `🚨 พรุ่งนี้น้ำมันปรับขึ้น +${activeDiff.toFixed(2)} ฿/ลิตร แวะเติมวันนี้ประหยัดกว่า!`
                    : `📉 พรุ่งนี้น้ำมันปรับลด ${activeDiff.toFixed(2)} ฿/ลิตร รอเติมพรุ่งนี้ประหยัดกว่า!`,
                size: 'xs',
                color: activeDiff > 0 ? '#b91c1c' : '#047857',
                weight: 'bold',
                wrap: true,
              },
            ],
          },
        ]
      : [];

  return {
    type: 'flex',
    altText: `⛽ ราคาน้ำมันวันนี้ (${brandLabel}): 95 ราคา ${fuelData.prices.gasohol_95?.toFixed(2) || '-'} ฿`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ea580c',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'LIVE FUEL PRICE', color: '#ffedd5', size: 'xxs', weight: 'bold' },
          { type: 'text', text: `⛽ ราคาน้ำมัน ${brandLabel}`, color: '#ffffff', size: 'lg', weight: 'bold', margin: 'xs' },
          { type: 'text', text: `อัปเดต: ${fuelData.date}`, color: '#ffedd5', size: 'xs', margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '16px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              ...rows,
              { type: 'separator', margin: 'md', color: '#e2e8f0' },
              buildRow('🏍️ ต้นทุนวิ่งจริง (รถคุณ)', `${costPerKm.toFixed(2)} ฿/กม. (@${rate} กม./ล.)`, '#2563eb', '#64748b', true, 'md'),
            ],
          },
          ...alertBanner,
        ],
      },
    },
  };
}

/**
 * Generates Vehicle Maintenance Status & Reset Actions Flex Card (Phase 3).
 */
export function generateMaintenanceFlex(
  latestOdo: number | null,
  latestOdoDate: string | null,
  botSettings: BotSettings,
  todayStr: string
) {
  const maint = evaluateMaintenance(latestOdo, botSettings, todayStr);
  const odoText = latestOdo && latestOdo > 0 ? `${latestOdo.toLocaleString('th-TH')} กม.` : 'ยังไม่มีข้อมูลเลขไมล์';

  const enginePct =
    maint.engineUsedKm !== null && botSettings.engine_oil_interval_km > 0
      ? Math.round((maint.engineUsedKm / botSettings.engine_oil_interval_km) * 100)
      : 0;
  const gearPct =
    maint.gearUsedKm !== null && botSettings.gear_oil_interval_km > 0
      ? Math.round((maint.gearUsedKm / botSettings.gear_oil_interval_km) * 100)
      : 0;

  const engineColor = enginePct >= 100 ? '#ef4444' : enginePct >= 85 ? '#f59e0b' : '#00b14f';
  const gearColor = gearPct >= 100 ? '#ef4444' : gearPct >= 85 ? '#f59e0b' : '#3b82f6';

  return {
    type: 'flex',
    altText: `🔧 สถานะเช็คระยะรถ (ไมล์ปัจจุบัน ${odoText})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: maint.hasWarning ? '#d97706' : '#0f766e',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'VEHICLE MAINTENANCE', color: '#ccfbf1', size: 'xxs', weight: 'bold' },
          { type: 'text', text: '🔧 สถานะดูแลรักษารถ', color: '#ffffff', size: 'lg', weight: 'bold', margin: 'xs' },
          {
            type: 'text',
            text: `เลขไมล์ล่าสุด: ${odoText}${latestOdoDate ? ` (${fmtDateSlash(latestOdoDate)})` : ''}`,
            color: '#f0fdfa',
            size: 'xs',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow(
                '🛢️ น้ำมันเครื่อง',
                botSettings.last_engine_oil_odo > 0 && maint.engineRemainingKm !== null
                  ? maint.engineRemainingKm <= 0
                    ? `เลยกำหนด ${Math.abs(maint.engineRemainingKm).toFixed(0)} กม.!`
                    : `เหลือ ${maint.engineRemainingKm.toFixed(0)} กม.`
                  : 'ยังไม่ตั้งไมล์ล่าสุด',
                engineColor
              ),
              buildProgressBar(enginePct, engineColor),
              {
                type: 'text',
                text: `เปลี่ยนล่าสุดที่ ${botSettings.last_engine_oil_odo.toLocaleString('th-TH')} กม. (รอบทุก ${botSettings.engine_oil_interval_km.toLocaleString('th-TH')} กม.)`,
                size: 'xxs',
                color: '#94a3b8',
                margin: 'xs',
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow(
                '⚙️ เฟืองท้าย / โซ่สเตอร์',
                botSettings.last_gear_oil_odo > 0 && maint.gearRemainingKm !== null
                  ? maint.gearRemainingKm <= 0
                    ? `เลยกำหนด ${Math.abs(maint.gearRemainingKm).toFixed(0)} กม.!`
                    : `เหลือ ${maint.gearRemainingKm.toFixed(0)} กม.`
                  : 'ยังไม่ตั้งไมล์ล่าสุด',
                gearColor
              ),
              buildProgressBar(gearPct, gearColor),
              {
                type: 'text',
                text: `เปลี่ยนล่าสุดที่ ${botSettings.last_gear_oil_odo.toLocaleString('th-TH')} กม. (รอบทุก ${botSettings.gear_oil_interval_km.toLocaleString('th-TH')} กม.)`,
                size: 'xxs',
                color: '#94a3b8',
                margin: 'xs',
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow(
                '📄 วันหมดอายุ พ.ร.บ./ภาษี',
                botSettings.tax_expire_date
                  ? `${fmtDateSlash(botSettings.tax_expire_date)}${maint.taxDaysLeft !== null ? ` (${maint.taxDaysLeft >= 0 ? `อีก ${maint.taxDaysLeft} วัน` : 'หมดอายุ!'})` : ''}`
                  : 'ยังไม่ได้ตั้งค่า',
                maint.taxDaysLeft !== null && maint.taxDaysLeft <= 14 ? '#ef4444' : '#0f172a'
              ),
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#f8fafc',
        paddingStart: '18px',
        paddingEnd: '18px',
        paddingBottom: '16px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '🛢️ เพิ่งถ่ายน้ำมันเครื่องวันนี้',
              data: `a=reset_oil&odo=${latestOdo || 0}`,
              displayText: 'บันทึกถ่ายน้ำมันเครื่องแล้ว',
            },
            style: 'primary',
            color: '#0f766e',
            height: 'sm',
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '⚙️ เพิ่งเปลี่ยนเฟืองท้าย/โซ่วันนี้',
              data: `a=reset_gear&odo=${latestOdo || 0}`,
              displayText: 'บันทึกเปลี่ยนเฟืองท้าย/โซ่แล้ว',
            },
            style: 'secondary',
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * Generates Goals Overview Flex Card (Daily, Weekly Trips, Monthly Profit).
 */
export function generateGoalsFlex(
  todayProfit: number,
  weekTrips: number,
  monthProfit: number,
  botSettings: BotSettings
) {
  const dPct = botSettings.daily_goal > 0 ? Math.round((todayProfit / botSettings.daily_goal) * 100) : 0;
  const wPct = botSettings.weekly_trips_goal > 0 ? Math.round((weekTrips / botSettings.weekly_trips_goal) * 100) : 0;
  const mPct = botSettings.monthly_goal > 0 ? Math.round((monthProfit / botSettings.monthly_goal) * 100) : 0;

  return {
    type: 'flex',
    altText: `🎯 เป้าหมาย: วันนี้ ${dPct}% | สัปดาห์ ${wPct}% | เดือนนี้ ${mPct}%`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#7c3aed',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'GOAL TRACKER', color: '#ede9fe', size: 'xxs', weight: 'bold' },
          { type: 'text', text: '🎯 ความคืบหน้าเป้าหมาย', color: '#ffffff', size: 'lg', weight: 'bold', margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow('☀️ กำไรวันนี้', `${fmt(todayProfit)} / ${fmtInt(botSettings.daily_goal)} ฿ (${dPct}%)`, dPct >= 100 ? '#00b14f' : '#2563eb'),
              buildProgressBar(dPct, dPct >= 100 ? '#00b14f' : '#3b82f6'),
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow('📦 งานสัปดาห์นี้', `${weekTrips} / ${botSettings.weekly_trips_goal} งาน (${wPct}%)`, wPct >= 100 ? '#00b14f' : '#7c3aed'),
              buildProgressBar(wPct, wPct >= 100 ? '#00b14f' : '#7c3aed'),
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            contents: [
              buildRow('🗓️ กำไรเดือนนี้', `${fmt(monthProfit)} / ${fmtInt(botSettings.monthly_goal)} ฿ (${mPct}%)`, mPct >= 100 ? '#00b14f' : '#0284c7'),
              buildProgressBar(mPct, mPct >= 100 ? '#00b14f' : '#0284c7'),
            ],
          },
          {
            type: 'text',
            text: '💡 ปรับเป้าทางแชทได้ เช่น พิมพ์: "ตั้งเป้าวัน 500", "ตั้งเป้างาน 50", "ตั้งเป้าเดือน 10000"',
            size: 'xxs',
            color: '#64748b',
            wrap: true,
          },
        ],
      },
    },
  };
}

/**
 * Generates Interactive Help & Command Cheat-Sheet Flex Card.
 */
export function generateHelpFlex(appUrl = DEFAULT_APP_URL) {
  return {
    type: 'flex',
    altText: '❓ คู่มือคำสั่ง Grab Tracker LINE Bot',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f172a',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'GRAB BOT COMMANDS', color: '#34d399', size: 'xxs', weight: 'bold' },
          { type: 'text', text: '🤖 วิธีสั่งงานบอทในแชท', color: '#ffffff', size: 'lg', weight: 'bold', margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            spacing: 'xs',
            contents: [
              { type: 'text', text: '📊 ดูสรุปรายงาน (ตอบฟรีทันใจ)', size: 'xs', weight: 'bold', color: '#00b14f' },
              {
                type: 'text',
                text: '• วันนี้ / เมื่อวาน / ดู 24/11\n• สัปดาห์นี้ / สัปดาห์ก่อน\n• เดือนนี้ / เดือนก่อน\n• ราคาน้ำมัน / เป้าหมาย / เช็คระยะ',
                size: 'xs',
                color: '#334155',
                wrap: true,
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            spacing: 'xs',
            contents: [
              { type: 'text', text: '✍️ พิมพ์บันทึกงานด่วน', size: 'xs', weight: 'bold', color: '#2563eb' },
              {
                type: 'text',
                text: 'ตัวอย่าง: "450 ทิป 30 งาน 11 ไมล์ 15420 3.5ชม"\nหรือ "บันทึกเมื่อวาน 380 ระยะ 45 2ชม30นาที ถอน 350"\nหรือวันหยุด: "หยุด พักผ่อน"',
                size: 'xs',
                color: '#334155',
                wrap: true,
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#ffffff',
            cornerRadius: '14px',
            paddingAll: '14px',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            spacing: 'xs',
            contents: [
              { type: 'text', text: '⚡ คำสั่งลัดแก้ไข & ตั้งเป้า', size: 'xs', weight: 'bold', color: '#7c3aed' },
              {
                type: 'text',
                text: '• "+ทิป 25" — บวกทิปเพิ่มให้วันนี้\n• "เติมน้ำมัน 120" — บวกค่าน้ำมันเติมจริง\n• "ตั้งเป้าวัน 500" / "ตั้งเป้างาน 50" / "ตั้งเป้าเดือน 10000"\n• "ถ่ายน้ำมันเครื่อง" — รีเซ็ตระยะจากไมล์ล่าสุด',
                size: 'xs',
                color: '#334155',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        backgroundColor: '#f8fafc',
        paddingStart: '16px',
        paddingEnd: '16px',
        paddingBottom: '16px',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '🎯 ดูเป้าหมายทั้งหมด', text: 'เป้าหมาย' },
            style: 'secondary',
            height: 'sm',
          },
          {
            type: 'button',
            action: { type: 'uri', label: '📊 เปิดเว็บ Grab Tracker', uri: appUrl },
            style: 'primary',
            color: '#00b14f',
            height: 'sm',
          },
        ],
      },
    },
  };
}

/** Format Thai month title helper */
export function formatThaiMonthTitle(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const name = TH_MONTHS[(m || 1) - 1] || monthKey;
  return `${name} ${(y || 2026) + 543}`;
}
