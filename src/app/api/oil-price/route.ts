import { NextRequest, NextResponse } from 'next/server';
import { getLiveFuelPrices } from '@/lib/oilPrice';

export async function GET(req: NextRequest) {
  const brandParam = req.nextUrl.searchParams.get('brand');
  const brand = brandParam === 'ptt' ? 'ptt' : 'bcp';

  const result = await getLiveFuelPrices(brand);
  if (result) {
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      success: false,
      error: 'ไม่สามารถดึงราคาน้ำมันได้จากทั้งบางจากและ ปตท. ในขณะนี้',
    },
    { status: 502 }
  );
}
