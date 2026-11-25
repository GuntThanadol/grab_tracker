export interface FuelPriceMap {
  gasohol_95?: number;
  gasohol_91?: number;
  gasohol_e20?: number;
  diesel?: number;
  [key: string]: number | undefined;
}

export interface FuelPriceResponse {
  success: boolean;
  brand: 'bcp' | 'ptt';
  date: string;
  prices: FuelPriceMap;
  tomorrowPrices?: FuelPriceMap;
  diffs?: FuelPriceMap;
  error?: string;
}

interface BangchakOilItem {
  OilName: string;
  PriceToday: number | string;
  PriceTomorrow?: number | string;
  PriceDifTomorrow?: number | string;
}

function classifyFuelKey(name: string, isPtt = false): keyof FuelPriceMap | null {
  if (name.includes('95') && !name.includes('พรีเมียม') && !(isPtt && name.includes('Super'))) {
    return 'gasohol_95';
  }
  if (name.includes('91')) {
    return 'gasohol_91';
  }
  if (name.includes('E20')) {
    return 'gasohol_e20';
  }
  if (
    (name.includes('ดีเซล') || name.includes('ไฮดีเซล')) &&
    !name.includes('B20') &&
    !name.includes('พรีเมียม') &&
    !(isPtt && name.includes('Super'))
  ) {
    return 'diesel';
  }
  return null;
}

/** Fetch live retail oil prices (plus tomorrow's price diff when available) from Bangchak. */
export async function fetchBangchak(): Promise<FuelPriceResponse | null> {
  try {
    const res = await fetch('https://oil-price.bangchak.co.th/ApiOilPrice2/th', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || !json[0]?.OilList) return null;

    const oilList: BangchakOilItem[] = JSON.parse(json[0].OilList);
    const dateStr = json[0].OilDateNow || new Date().toLocaleDateString('th-TH');

    const prices: FuelPriceMap = {};
    const tomorrowPrices: FuelPriceMap = {};
    const diffs: FuelPriceMap = {};

    for (const item of oilList) {
      const key = classifyFuelKey(item.OilName || '');
      if (!key) continue;

      const price = typeof item.PriceToday === 'number' ? item.PriceToday : parseFloat(item.PriceToday);
      if (isNaN(price)) continue;
      prices[key] = price;

      if (item.PriceTomorrow !== undefined) {
        const tmw = typeof item.PriceTomorrow === 'number' ? item.PriceTomorrow : parseFloat(item.PriceTomorrow);
        if (!isNaN(tmw) && tmw > 0) tomorrowPrices[key] = tmw;
      }

      if (item.PriceDifTomorrow !== undefined) {
        const diff = typeof item.PriceDifTomorrow === 'number' ? item.PriceDifTomorrow : parseFloat(item.PriceDifTomorrow);
        if (!isNaN(diff)) diffs[key] = diff;
      } else if (tomorrowPrices[key] !== undefined) {
        diffs[key] = Number((tomorrowPrices[key]! - price).toFixed(2));
      }
    }

    return {
      success: true,
      brand: 'bcp',
      date: dateStr,
      prices,
      tomorrowPrices,
      diffs,
    };
  } catch (err) {
    console.error('Error fetching Bangchak oil price:', err);
    return null;
  }
}

/** Fetch live retail oil prices from PTT SOAP WebService. */
export async function fetchPTT(): Promise<FuelPriceResponse | null> {
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
        SOAPAction: '"https://orapiweb.pttor.com/CurrentOilPrice"',
      },
      body: xml,
      next: { revalidate: 1800 },
    });

    if (!res.ok) return null;
    const text = await res.text();

    const prices: FuelPriceMap = {};
    let dateStr = new Date().toLocaleDateString('th-TH');

    const fuelRegex =
      /<FUEL>[\s\S]*?<PRICE_DATE>(.*?)<\/PRICE_DATE>[\s\S]*?<PRODUCT>(.*?)<\/PRODUCT>[\s\S]*?<PRICE>(.*?)<\/PRICE>[\s\S]*?<\/FUEL>/g;
    let match: RegExpExecArray | null;

    while ((match = fuelRegex.exec(text)) !== null) {
      const priceDate = match[1];
      const product = match[2];
      const price = parseFloat(match[3]);

      if (priceDate && !dateStr) {
        dateStr = priceDate.split('T')[0];
      }

      if (isNaN(price)) continue;
      const key = classifyFuelKey(product, true);
      if (key) prices[key] = price;
    }

    return {
      success: true,
      brand: 'ptt',
      date: dateStr,
      prices,
    };
  } catch (err) {
    console.error('Error fetching PTT oil price:', err);
    return null;
  }
}

/** Fetch live fuel prices with automatic fallback between Bangchak and PTT. */
export async function getLiveFuelPrices(brand: 'bcp' | 'ptt' = 'bcp'): Promise<FuelPriceResponse | null> {
  let result: FuelPriceResponse | null = null;

  if (brand === 'ptt') {
    result = await fetchPTT();
    if (!result || !result.prices.gasohol_95) {
      result = await fetchBangchak();
    }
  } else {
    result = await fetchBangchak();
    if (!result || !result.prices.gasohol_95) {
      result = await fetchPTT();
    }
  }

  if (
    result &&
    (result.prices.gasohol_95 ||
      result.prices.gasohol_91 ||
      result.prices.gasohol_e20 ||
      result.prices.diesel)
  ) {
    return result;
  }

  return null;
}
