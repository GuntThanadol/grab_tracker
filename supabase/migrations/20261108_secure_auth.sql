-- Apply this migration to an existing Grab Tracker database.
-- It preserves existing entries and fuel settings.

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

alter table public.entries enable row level security;
alter table public.fuel_settings enable row level security;

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
