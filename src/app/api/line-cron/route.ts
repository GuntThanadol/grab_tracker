import { NextRequest, NextResponse } from 'next/server';
import { pushLineMessages } from '@/lib/lineApi';
import {
  buildMaintenanceMessage,
  buildPeriodSummaryMessage,
  getLatestOdometerServer,
  resolveAppUrl,
} from '@/lib/lineBotService';
import { evaluateMaintenance, generateFuelPriceFlex } from '@/lib/lineFlex';
import { getLiveFuelPrices } from '@/lib/oilPrice';
import {
  fetchBotSettingsServer,
  fetchFuelSettingsServer,
  getSupabaseAdmin,
  shiftDateStr,
  upsertBotSettingsServer,
  verifyAdminBearer,
} from '@/lib/supabaseAdmin';
import { getTodayThai } from '@/lib/utils';

async function isAuthorizedCron(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get('authorization') || '';

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const { isAdmin } = await verifyAdminBearer(req);
  if (isAdmin) return true;

  // Allow Vercel Cron user-agent when CRON_SECRET is not configured
  if (!cronSecret && req.headers.get('x-vercel-cron')) {
    return true;
  }

  return !cronSecret;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedCron(req))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    const userId = process.env.LINE_USER_ID?.trim();
    const adminDb = getSupabaseAdmin();

    if (!token || !userId || !adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID หรือ SUPABASE_SERVICE_ROLE_KEY',
        },
        { status: 400 }
      );
    }

    const force = req.nextUrl.searchParams.get('force');
    const todayStr = getTodayThai();
    const appUrl = resolveAppUrl(req.nextUrl.origin);

    const [{ settings: botSettings }, fuelSettings, latestOdo] = await Promise.all([
      fetchBotSettingsServer(adminDb),
      fetchFuelSettingsServer(adminDb),
      getLatestOdometerServer(adminDb),
    ]);

    const pushed: string[] = [];
    const messagesToSend: Record<string, unknown>[] = [];

    // 1. Fuel Price Tomorrow Change Check
    const oilData = await getLiveFuelPrices(fuelSettings.brand || 'bcp');
    if (oilData) {
      const activeKey = fuelSettings.fuel_type || 'gasohol_95';
      const activeDiff = oilData.diffs?.[activeKey] || 0;
      if ((activeDiff !== 0 && botSettings.last_notified_oil_date !== todayStr) || force === 'oil') {
        messagesToSend.push(generateFuelPriceFlex(oilData, fuelSettings));
        await upsertBotSettingsServer(adminDb, { last_notified_oil_date: todayStr });
        pushed.push('oil_alert');
      }
    }

    // 2. Vehicle Maintenance & Tax Expiry Check
    const maintStatus = evaluateMaintenance(latestOdo?.odometer ?? null, botSettings, todayStr);
    if (maintStatus.hasWarning || force === 'maintenance') {
      messagesToSend.push(await buildMaintenanceMessage(adminDb, todayStr));
      pushed.push('maintenance_alert');
    }

    // 3. Weekly Summary (Sundays in Asia/Bangkok or ?force=weekly)
    const bangkokWeekday = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
    });
    if ((bangkokWeekday === 'Sun' && botSettings.last_weekly_report_date !== todayStr) || force === 'weekly') {
      messagesToSend.push(await buildPeriodSummaryMessage(adminDb, 'week', 0, todayStr, appUrl));
      await upsertBotSettingsServer(adminDb, { last_weekly_report_date: todayStr });
      pushed.push('weekly_summary');
    }

    // 4. Monthly Summary (Last day of month or ?force=monthly)
    const tomorrowStr = shiftDateStr(todayStr, 1);
    if (tomorrowStr.slice(0, 7) !== todayStr.slice(0, 7) || force === 'monthly') {
      messagesToSend.push(await buildPeriodSummaryMessage(adminDb, 'month', 0, todayStr, appUrl));
      pushed.push('monthly_summary');
    }

    if (messagesToSend.length > 0) {
      const sendRes = await pushLineMessages(userId, messagesToSend.slice(0, 5), token, true);
      if (!sendRes.ok) {
        return NextResponse.json(
          { success: false, error: sendRes.error || 'Push failed', pushed },
          { status: sendRes.status || 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      pushed,
      message: pushed.length > 0 ? `ส่งแจ้งเตือนแล้ว (${pushed.join(', ')})` : 'ไม่มีแจ้งเตือนที่ต้องส่งวันนี้',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
