# 🏍️ Grab Tracker - บัญชีรายวันอัจฉริยะ (Next.js + Supabase)

## 🌟 Feature 
- 📊 **Dashboard**: 11 การ์ด KPI, กราฟคอลัมน์ 30 วัน, ความคุ้มค่ารายได้เฉลี่ยต่อกิโลเมตร
- 🛵 **Smart Fuel Tracker**: คำนวณค่าน้ำมันอัตโนมัติจากระยะทางสำหรับ Honda Wave 125i (71.4 กม./ลิตร)
- ⛽ **Live Fuel Prices**: ดึงราคาน้ำมันสดจากบางจากและ ปตท. แบบ Real-time
- 📋 **ประวัติรายวัน & การแก้ไข**: ค้นหาด่วน, ตัวกรองเดือน, แก้ไขข้อมูลสด, Export ไฟล์ Excel (`.xlsx`)
- 🟢 **Real-time Sync**: ข้อมูลซิงค์ทุกอุปกรณ์ทันทีผ่าน Supabase WebSockets Engine
- 🌓 **Theme (Dark / Light Mode)**

## 🚀 Tech
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL Cloud + Realtime Engine)
- **Deployment**: Vercel

## Security setup (required once)

1. For an existing database, run `supabase/migrations/20261108_secure_auth.sql` in the Supabase SQL Editor to replace the old public RLS policies. Fresh installations can use either schema file.
2. In Supabase Authentication, enable **Email** sign-in and **Anonymous Sign-Ins**.
3. Create the administrator's email/password user in Supabase Authentication, then run the following in the SQL Editor with that user's UUID:

```sql
insert into public.app_admins (user_id) values ('YOUR_AUTH_USER_UUID');
```

4. Rotate the previous LINE channel access token, then set the new token and `LINE_USER_ID` only in `.env.local` or the deployment environment. Do not place either value in browser storage or source code.
