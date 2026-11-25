import { NextRequest, NextResponse } from 'next/server';
import {
  fetchBotSettingsServer,
  getSupabaseAdmin,
  upsertBotSettingsServer,
  verifyAdminBearer,
} from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const { isAdmin, client } = await verifyAdminBearer(req);
  if (!isAdmin || !client) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdmin() || client;
  const { settings, tableExists } = await fetchBotSettingsServer(adminClient);

  return NextResponse.json({
    success: true,
    tableExists,
    settings,
  });
}

export async function PUT(req: NextRequest) {
  const { isAdmin, client } = await verifyAdminBearer(req);
  if (!isAdmin || !client) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const adminClient = getSupabaseAdmin() || client;

  const result = await upsertBotSettingsServer(adminClient, {
    daily_goal: body.daily_goal !== undefined ? Math.max(0, Number(body.daily_goal)) : undefined,
    weekly_trips_goal: body.weekly_trips_goal !== undefined ? Math.max(1, Math.round(Number(body.weekly_trips_goal))) : undefined,
    monthly_goal: body.monthly_goal !== undefined ? Math.max(0, Number(body.monthly_goal)) : undefined,
    engine_oil_interval_km: body.engine_oil_interval_km !== undefined ? Math.max(100, Math.round(Number(body.engine_oil_interval_km))) : undefined,
    last_engine_oil_odo: body.last_engine_oil_odo !== undefined ? Math.max(0, Number(body.last_engine_oil_odo)) : undefined,
    gear_oil_interval_km: body.gear_oil_interval_km !== undefined ? Math.max(100, Math.round(Number(body.gear_oil_interval_km))) : undefined,
    last_gear_oil_odo: body.last_gear_oil_odo !== undefined ? Math.max(0, Number(body.last_gear_oil_odo)) : undefined,
    tax_expire_date: body.tax_expire_date === '' ? null : body.tax_expire_date,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        tableExists: result.tableExists,
        settings: result.settings,
        error: result.error || 'บันทึกการตั้งค่าไม่สำเร็จ',
      },
      { status: result.tableExists ? 400 : 409 }
    );
  }

  return NextResponse.json({
    success: true,
    tableExists: true,
    settings: result.settings,
  });
}
