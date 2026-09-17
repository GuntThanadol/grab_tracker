# 🏍️ Grab Tracker - บัญชีรายวันอัจฉริยะ (Next.js + Supabase)

เว็บแอปพลิเคชันบันทึกบัญชีรายได้และคำนวณค่าน้ำมันอัจฉริยะสำหรับคนขับ Grab Rider

## 🌟 ฟีเจอร์หลัก
- 📊 **Dashboard สถิติครบวงจร**: 11 การ์ด KPI, กราฟคอลัมน์ 30 วัน, ความคุ้มค่ารายได้เฉลี่ยต่อกิโลเมตร
- 🛵 **Smart Fuel Tracker**: คำนวณค่าน้ำมันอัตโนมัติจากระยะทางสำหรับ Honda Wave 125i (71.4 กม./ลิตร)
- ⛽ **Live Fuel Prices**: ดึงราคาน้ำมันสดจากบางจากและ ปตท. แบบ Real-time
- 📋 **ประวัติรายวัน & การแก้ไข**: ค้นหาด่วน, ตัวกรองเดือน, แก้ไขข้อมูลสด, Export ไฟล์ Excel (`.xlsx`)
- 🟢 **Real-time Sync**: ข้อมูลซิงค์ทุกอุปกรณ์ทันทีผ่าน Supabase WebSockets Engine
- 🌓 **ธีมมืดและสว่าง (Dark / Light Mode)**

## 🚀 เทคโนโลยีที่ใช้
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL Cloud + Realtime Engine)
- **Deployment**: Vercel
