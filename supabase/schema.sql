-- ========================================================
-- GRAB TRACKER SUPABASE SCHEMA
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENTRIES TABLE (Daily Driver Records)
create table if not exists public.entries (
    id text primary key,
    date date not null unique,
    grab numeric(10,2) default 0,
    tip numeric(10,2) default 0,
    trips integer,
    distance numeric(10,2),
    oil numeric(10,2) default 0,
    oil_real numeric(10,2) default 0,
    credit numeric(10,2) default 0,
    withdraw numeric(10,2) default 0,
    hours numeric(5,2),
    note text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for fast date range queries
create index if not exists idx_entries_date on public.entries(date desc);

-- 2. FUEL SETTINGS TABLE
create table if not exists public.fuel_settings (
    id int primary key default 1,
    brand text default 'bcp',
    fuel_type text default 'gasohol_95',
    rate_km_per_l numeric(5,2) default 71.4,
    manual_price numeric(6,2),
    last_fetched_price numeric(6,2) default 39.09,
    last_fetched_date text default '',
    updated_at timestamptz default now(),
    constraint single_row check (id = 1)
);

-- Insert default fuel settings if not present
insert into public.fuel_settings (id, brand, fuel_type, rate_km_per_l, last_fetched_price)
values (1, 'bcp', 'gasohol_95', 71.4, 39.09)
on conflict (id) do nothing;

-- 3. ENABLE REALTIME
alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.fuel_settings;

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.entries enable row level security;
alter table public.fuel_settings enable row level security;

-- Application roles are backed by Supabase Auth, never by browser storage.
create table if not exists public.app_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "Allow all access to entries" on public.entries;
drop policy if exists "Allow all access to fuel_settings" on public.fuel_settings;
drop policy if exists "Authenticated users can read entries" on public.entries;
drop policy if exists "Admins can manage entries" on public.entries;
drop policy if exists "Authenticated users can read fuel settings" on public.fuel_settings;
drop policy if exists "Admins can manage fuel settings" on public.fuel_settings;
drop policy if exists "Users can read their own admin role" on public.app_admins;

create policy "Authenticated users can read entries"
on public.entries for select to authenticated using (true);
create policy "Admins can manage entries"
on public.entries for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

create policy "Authenticated users can read fuel settings"
on public.fuel_settings for select to authenticated using (true);
create policy "Admins can manage fuel settings"
on public.fuel_settings for all to authenticated
using (public.is_app_admin()) with check (public.is_app_admin());

create policy "Users can read their own admin role"
on public.app_admins for select to authenticated using (user_id = auth.uid());
