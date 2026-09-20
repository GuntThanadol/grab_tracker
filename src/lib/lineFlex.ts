import { Entry } from '@/types';
import { fmt, fmtDateSlash, fmtDateTh, income, profit } from '@/lib/utils';

/**
 * Generate a beautiful LINE Flex Message for daily Grab report
 */
export function generateGrabFlexMessage(entry: Entry, appUrl = 'https://grab-tracker-alpha.vercel.app/') {
  const inc = income(entry);
  const p = profit(entry);
  const dist = entry.distance ? parseFloat(entry.distance.toString()) : 0;
  const hours = entry.hours ? parseFloat(entry.hours.toString()) : 0;
  const avgPerHour = hours > 0 ? (inc / hours).toFixed(2) : null;
  const avgPerKm = dist > 0 ? (inc / dist).toFixed(2) : null;

  const isPositiveProfit = p >= 0;
  const profitColor = isPositiveProfit ? '#00b14f' : '#ef4444';
  const profitSign = isPositiveProfit ? '+' : '';

  // Construct key-value rows
  const detailRows: any[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '🛵 ค่ารอบ Grab', size: 'sm', color: '#64748b', flex: 4 },
        { type: 'text', text: `${fmt(entry.grab)} ฿`, size: 'sm', color: '#0f172a', weight: 'bold', align: 'end', flex: 6 },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '🎁 ทิปมือ', size: 'sm', color: '#64748b', flex: 4 },
        { type: 'text', text: `${fmt(entry.tip)} ฿`, size: 'sm', color: '#0f172a', weight: 'bold', align: 'end', flex: 6 },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '💰 รวมรายรับ', size: 'sm', color: '#00b14f', weight: 'bold', flex: 4 },
        { type: 'text', text: `${fmt(inc)} ฿`, size: 'sm', color: '#00b14f', weight: 'bold', align: 'end', flex: 6 },
      ],
    },
    { type: 'separator', margin: 'md', color: '#e2e8f0' },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: '📍 ระยะทางวิ่ง', size: 'sm', color: '#64748b', flex: 4 },
        { type: 'text', text: dist > 0 ? `${dist.toFixed(1)} กม.` : '—', size: 'sm', color: '#2563eb', weight: 'bold', align: 'end', flex: 6 },
      ],
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '⛽ ค่าน้ำมัน (ประมาณ)', size: 'sm', color: '#64748b', flex: 5 },
        { type: 'text', text: `${fmt(entry.oil)} ฿`, size: 'sm', color: '#e11d48', weight: 'bold', align: 'end', flex: 5 },
      ],
    },
  ];

  if (Number(entry.oil_real) > 0) {
    detailRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '⛽ เติมน้ำมันจริง', size: 'sm', color: '#64748b', flex: 5 },
        { type: 'text', text: `${fmt(entry.oil_real)} ฿`, size: 'sm', color: '#475569', weight: 'bold', align: 'end', flex: 5 },
      ],
    });
  }

  detailRows.push({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: '⏱️ ชั่วโมงวิ่งงาน', size: 'sm', color: '#64748b', flex: 4 },
      { type: 'text', text: hours > 0 ? `${hours} ชม.` : '—', size: 'sm', color: '#0f172a', weight: 'bold', align: 'end', flex: 6 },
    ],
  });

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
    detailRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '🏦 ถอนเข้ากรุงศรี', size: 'sm', color: '#64748b', flex: 5 },
        { type: 'text', text: `${fmt(entry.withdraw)} ฿`, size: 'sm', color: '#0f172a', weight: 'bold', align: 'end', flex: 5 },
      ],
    });
  }

  if (Number(entry.credit) > 0) {
    detailRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '💳 เติมเครดิต Grab', size: 'sm', color: '#64748b', flex: 5 },
        { type: 'text', text: `${fmt(entry.credit)} ฿`, size: 'sm', color: '#0f172a', weight: 'bold', align: 'end', flex: 5 },
      ],
    });
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
              {
                type: 'text',
                text: 'GRAB TRACKER',
                color: '#ffffff',
                weight: 'bold',
                size: 'xs',
              },
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
        contents: [
          // Net Profit Hero Banner
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
          // Detailed list
          {
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
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#f8fafc',
        paddingStart: '20px',
        paddingEnd: '20px',
        paddingBottom: '16px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '📊 เปิดดูระบบ Grab Tracker',
              uri: appUrl,
            },
            style: 'primary',
            color: '#00b14f',
            height: 'sm',
          },
        ],
      },
      styles: {
        footer: {
          separator: false,
        },
      },
    },
  };
}
