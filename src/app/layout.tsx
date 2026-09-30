import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grab บัญชีรายวัน - Smart Tracker',
  description: 'ระบบบันทึกบัญชีรายได้และคำนวณค่าน้ำมันอัจฉริยะสำหรับคนขับ Grab',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00b14f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-motorcycle-light text-slate-900 antialiased dark:bg-motorcycle-dark dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
