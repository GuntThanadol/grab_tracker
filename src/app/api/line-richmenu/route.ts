import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminBearer } from '@/lib/supabaseAdmin';
import { resolveAppUrl } from '@/lib/lineBotService';

const RICH_MENU_NAME = 'Grab Tracker Smart Menu v1';

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await verifyAdminBearer(req);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้ระบุ LINE_CHANNEL_ACCESS_TOKEN' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get('image');
    const customAppUrl = formData.get('appUrl');
    const appUrl =
      typeof customAppUrl === 'string' && customAppUrl.startsWith('http')
        ? customAppUrl
        : resolveAppUrl(req.nextUrl.origin);

    if (!(imageFile instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์รูป Rich Menu' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 1. Delete older Rich Menus created by this app so we don't hit LINE's menu limit
    const listRes = await fetch('https://api.line.me/v2/bot/richmenu/list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listRes.ok) {
      const listJson = (await listRes.json()) as {
        richmenus?: Array<{ richMenuId: string; name?: string }>;
      };
      const oldMenus = (listJson.richmenus || []).filter((m) => m.name === RICH_MENU_NAME);
      for (const old of oldMenus) {
        await fetch(`https://api.line.me/v2/bot/richmenu/${old.richMenuId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }

    // 2. Create 1200x810 6-tile Rich Menu definition
    const menuPayload = {
      size: { width: 1200, height: 810 },
      selected: true,
      name: RICH_MENU_NAME,
      chatBarText: '📱 เมนู Grab Tracker',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 400, height: 405 },
          action: { type: 'message', label: 'วันนี้', text: 'วันนี้' },
        },
        {
          bounds: { x: 400, y: 0, width: 400, height: 405 },
          action: { type: 'message', label: 'สัปดาห์นี้', text: 'สัปดาห์นี้' },
        },
        {
          bounds: { x: 800, y: 0, width: 400, height: 405 },
          action: { type: 'message', label: 'เดือนนี้', text: 'เดือนนี้' },
        },
        {
          bounds: { x: 0, y: 405, width: 400, height: 405 },
          action: { type: 'message', label: 'วิธีใช้และบันทึก', text: 'ช่วยเหลือ' },
        },
        {
          bounds: { x: 400, y: 405, width: 400, height: 405 },
          action: { type: 'message', label: 'เช็คระยะและน้ำมัน', text: 'เช็คระยะ' },
        },
        {
          bounds: { x: 800, y: 405, width: 400, height: 405 },
          action: { type: 'uri', label: 'เปิดเว็บ Grab Tracker', uri: appUrl },
        },
      ],
    };

    const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(menuPayload),
    });

    const createJson = (await createRes.json().catch(() => ({}))) as {
      richMenuId?: string;
      message?: string;
    };
    if (!createRes.ok || !createJson.richMenuId) {
      return NextResponse.json(
        {
          success: false,
          error: `สร้าง Rich Menu ไม่สำเร็จ (${createRes.status}): ${createJson.message || 'Unknown error'}`,
        },
        { status: createRes.status || 500 }
      );
    }

    const richMenuId = createJson.richMenuId;

    // 3. Upload PNG artwork to api-data.line.me
    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        Authorization: `Bearer ${token}`,
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.json().catch(() => ({}));
      await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: `อัปโหลดรูป Rich Menu ไม่สำเร็จ (${uploadRes.status}): ${(uploadErr as { message?: string }).message || ''}`,
        },
        { status: uploadRes.status || 500 }
      );
    }

    // 4. Set as default Rich Menu for all users of this OA
    const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!defaultRes.ok) {
      const defErr = await defaultRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: `ตั้งค่า Default Rich Menu ไม่สำเร็จ (${defaultRes.status}): ${(defErr as { message?: string }).message || ''}`,
        },
        { status: defaultRes.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      richMenuId,
      message: 'ติดตั้ง Rich Menu ในแชท LINE OA เรียบร้อยแล้ว!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { isAdmin } = await verifyAdminBearer(req);
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ success: false, error: 'ยังไม่ได้ระบุ LINE_CHANNEL_ACCESS_TOKEN' }, { status: 400 });
  }

  const res = await fetch('https://api.line.me/v2/bot/user/all/richmenu', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: `ลบ Rich Menu ไม่สำเร็จ (${res.status})` }, { status: res.status });
  }

  return NextResponse.json({ success: true, message: 'ยกเลิก Rich Menu ค่าเริ่มต้นเรียบร้อยแล้ว' });
}
