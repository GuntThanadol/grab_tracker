import { NextRequest, NextResponse } from 'next/server';

interface FuelPriceResponse {
  success: boolean;
  brand: 'bcp' | 'ptt';
  date: string;
  prices: {
    gasohol_95?: number;
    gasohol_91?: number;
    gasohol_e20?: number;
    diesel?: number;
    [key: string]: number | undefined;
  };
  error?: string;
}

// Helper: Fetch from Bangchak API
async function fetchBangchak(): Promise<FuelPriceResponse | null> {
  try {
    const res = await fetch('https://oil-price.bangchak.co.th/ApiOilPrice2/th', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 } // Cache for 30 minutes
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || !json[0]?.OilList) return null;

    const oilList: Array<{ OilName: string; PriceToday: number }> = JSON.parse(json[0].OilList);
    const dateStr = json[0].OilDateNow || new Date().toLocaleDateString('th-TH');

    const prices: FuelPriceResponse['prices'] = {};

    for (const item of oilList) {
      const name = item.OilName;
      const price = typeof item.PriceToday === 'number' ? item.PriceToday : parseFloat(item.PriceToday);
      if (isNaN(price)) continue;

      if (name.includes('95') && !name.includes('พรีเมียม')) {
        prices.gasohol_95 = price;
      } else if (name.includes('91')) {
        prices.gasohol_91 = price;
      } else if (name.includes('E20')) {
        prices.gasohol_e20 = price;
      } else if ((name.includes('ดีเซล') || name.includes('ไฮดีเซล')) && !name.includes('B20') && !name.includes('พรีเมียม')) {
        prices.diesel = price;
      }
    }

    return {
      success: true,
      brand: 'bcp',
      date: dateStr,
      prices
    };
  } catch (err) {
    console.error('Error fetching Bangchak oil price:', err);
    return null;
  }
}

// Helper: Fetch from PTT SOAP WebService
async function fetchPTT(): Promise<FuelPriceResponse | null> {
  try {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CurrentOilPrice xmlns="http://www.pttor.com">
      <Language>thai</Language>
    </CurrentOilPrice>
  </soap:Body>
</soap:Envelope>`;

    const res = await fetch('https://orapiweb.pttor.com/oilservice/OilPrice.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"https://orapiweb.pttor.com/CurrentOilPrice"'
      },
      body: xml,
      next: { revalidate: 1800 }
    });

    if (!res.ok) return null;
    const text = await res.text();

    const prices: FuelPriceResponse['prices'] = {};
    let dateStr = new Date().toLocaleDateString('th-TH');

    // Parse XML snippet inside SOAP
    // <PRODUCT>เบนซินแก๊สโซฮอล์ 95</PRODUCT> <PRICE>39.34</PRICE>
    const fuelRegex = /<FUEL>[\s\S]*?<PRICE_DATE>(.*?)<\/PRICE_DATE>[\s\S]*?<PRODUCT>(.*?)<\/PRODUCT>[\s\S]*?<PRICE>(.*?)<\/PRICE>[\s\S]*?<\/FUEL>/g;
    let match;

    while ((match = fuelRegex.exec(text)) !== null) {
      const priceDate = match[1];
      const product = match[2];
      const price = parseFloat(match[3]);

      if (priceDate && !dateStr) {
        dateStr = priceDate.split('T')[0];
      }

      if (isNaN(price)) continue;

      if (product.includes('95') && !product.includes('Super') && !product.includes('พรีเมียม')) {
        prices.gasohol_95 = price;
      } else if (product.includes('91')) {
        prices.gasohol_91 = price;
      } else if (product.includes('E20')) {
        prices.gasohol_e20 = price;
      } else if (product.includes('ดีเซล') && !product.includes('B20') && !product.includes('Super') && !product.includes('พรีเมียม')) {
        prices.diesel = price;
      }
    }

    return {
      success: true,
      brand: 'ptt',
      date: dateStr,
      prices
    };
  } catch (err) {
    console.error('Error fetching PTT oil price:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get('brand') || 'bcp';

  let result: FuelPriceResponse | null = null;

  if (brand === 'ptt') {
    result = await fetchPTT();
    // fallback to bangchak if ptt fails
    if (!result || !result.prices.gasohol_95) {
      result = await fetchBangchak();
    }
  } else {
    result = await fetchBangchak();
    // fallback to ptt if bangchak fails
    if (!result || !result.prices.gasohol_95) {
      result = await fetchPTT();
    }
  }

  if (result && (result.prices.gasohol_95 || result.prices.gasohol_91 || result.prices.gasohol_e20 || result.prices.diesel)) {
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      success: false,
      error: 'ไม่สามารถดึงราคาน้ำมันได้จากทั้งบางจากและ ปตท. ในขณะนี้'
    },
    { status: 502 }
  );
}
