import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateGrabFlexMessage } from '@/lib/lineFlex';
import { Entry } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function isAdmin(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken || !supabaseUrl || !supabaseAnonKey) return false;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return false;

  const { data: admin } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  return Boolean(admin);
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entry, isTest } = body;

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

    let flexMessage: any;

    if (isTest) {
      const mockEntry: Entry = {
        id: 'test_preview',
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
        grab: 350.50,
        tip: 40.00,
        distance: 48.5,
        oil: 26.50,
        oil_real: 50.00,
        credit: 100.00,
        withdraw: 300.00,
        hours: 3.0,
        note: '🔔 ข้อความทดสอบเชื่อมต่อ LINE สำเร็จ 100%',
      };
      flexMessage = generateGrabFlexMessage(mockEntry);
      flexMessage.altText = '🔔 ทดสอบการเชื่อมต่อ LINE Messaging API สำเร็จ!';
    } else if (entry) {
      flexMessage = generateGrabFlexMessage(entry);
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล entry ที่ต้องการส่ง' },
        { status: 400 }
      );
    }

    // Call LINE Messaging API push endpoint
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [flexMessage],
      }),
    });

    if (!lineResponse.ok) {
      const errJson = await lineResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: `LINE API Error (${lineResponse.status}): ${errJson.message || 'ส่งข้อความไม่สำเร็จ โปรดตรวจสอบ Token หรือ User ID'}`,
          details: errJson,
        },
        { status: lineResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: isTest ? 'ส่งข้อความทดสอบเข้า LINE เรียบร้อยแล้ว' : 'ส่งสรุปงานเข้า LINE เรียบร้อยแล้ว',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
