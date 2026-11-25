import { NextRequest, NextResponse } from 'next/server';
import { generateGrabFlexMessage } from '@/lib/lineFlex';
import { pushLineMessages } from '@/lib/lineApi';
import {
  buildDailyReportMessage,
  buildMaintenanceMessage,
  buildPeriodSummaryMessage,
  resolveAppUrl,
} from '@/lib/lineBotService';
import { getSupabaseAdmin, verifyAdminBearer } from '@/lib/supabaseAdmin';
import { getTodayThai } from '@/lib/utils';
import { Entry } from '@/types';

export async function GET(req: NextRequest) {
  const { isAdmin } = await verifyAdminBearer(req);
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccessToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim());
  const hasUserId = Boolean(process.env.LINE_USER_ID?.trim());
  const hasChannelSecret = Boolean(process.env.LINE_CHANNEL_SECRET?.trim());
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasCronSecret = Boolean(process.env.CRON_SECRET?.trim());

  return NextResponse.json({
    success: true,
    configured: hasAccessToken && hasUserId,
    hasAccessToken,
    hasUserId,
    hasChannelSecret,
    hasServiceRoleKey,
    hasCronSecret,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, client } = await verifyAdminBearer(req);
    if (!isAdmin || !client) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entry, isTest, reportType } = body as {
      entry?: Entry;
      isTest?: boolean;
      reportType?: 'daily' | 'weekly' | 'monthly' | 'maintenance';
    };

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    const userId = process.env.LINE_USER_ID?.trim();

    if (!token || !userId) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: 'ยังไม่ได้ระบุ LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_USER_ID',
        },
        { status: 400 }
      );
    }

    const dbClient = getSupabaseAdmin() || client;
    const appUrl = resolveAppUrl(req.nextUrl.origin);
    const todayStr = getTodayThai();

    let flexMessage: Record<string, unknown>;
    let successMessage = 'ส่งสรุปงานเข้า LINE เรียบร้อยแล้ว';

    if (isTest) {
      const mockEntry: Entry = {
        id: 'test_preview',
        date: todayStr,
        grab: 350.5,
        tip: 40.0,
        trips: 9,
        distance: 48.5,
        oil: 26.5,
        oil_real: 50.0,
        credit: 100.0,
        withdraw: 300.0,
        hours: 3.0,
        note: '🔔 ข้อความทดสอบเชื่อมต่อ LINE สำเร็จ 100%',
      };
      flexMessage = await buildDailyReportMessage(dbClient, mockEntry, appUrl);
      flexMessage.altText = '🔔 ทดสอบการเชื่อมต่อ LINE สำเร็จ!';
      successMessage = 'ส่งข้อความทดสอบเข้า LINE เรียบร้อยแล้ว';
    } else if (reportType === 'weekly') {
      flexMessage = await buildPeriodSummaryMessage(dbClient, 'week', 0, todayStr, appUrl);
      successMessage = 'ส่งสรุปรายสัปดาห์เข้า LINE เรียบร้อยแล้ว';
    } else if (reportType === 'monthly') {
      flexMessage = await buildPeriodSummaryMessage(dbClient, 'month', 0, todayStr, appUrl);
      successMessage = 'ส่งสรุปรายเดือนเข้า LINE เรียบร้อยแล้ว';
    } else if (reportType === 'maintenance') {
      flexMessage = await buildMaintenanceMessage(dbClient, todayStr);
      successMessage = 'ส่งการ์ดเช็คระยะรถเข้า LINE เรียบร้อยแล้ว';
    } else if (entry) {
      try {
        flexMessage = await buildDailyReportMessage(dbClient, entry, appUrl);
      } catch {
        flexMessage = generateGrabFlexMessage(entry, appUrl);
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล entry ที่ต้องการส่ง' },
        { status: 400 }
      );
    }

    const sendRes = await pushLineMessages(userId, [flexMessage], token, true);
    if (!sendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `LINE API Error (${sendRes.status}): ${sendRes.error || 'ส่งข้อความไม่สำเร็จ โปรดตรวจสอบ Token หรือ User ID'}`,
          details: sendRes.details,
        },
        { status: sendRes.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
