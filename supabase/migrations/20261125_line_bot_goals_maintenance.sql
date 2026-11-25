-- ========================================================
-- LINE BOT GOALS, VEHICLE MAINTENANCE & STATE SETTINGS
-- ========================================================

create table if not exists public.bot_settings (
    id int primary key default 1,
    daily_goal numeric(10,2) not null default 400,
    weekly_trips_goal integer not null default 45,
    monthly_goal numeric(10,2) not null default 8000,
    engine_oil_interval_km integer not null default 2500,
    last_engine_oil_odo numeric(10,1) not null default 0,
    gear_oil_interval_km integer not null default 5000,
    last_gear_oil_odo numeric(10,1) not null default 0,
    tax_expire_date date,
    last_notified_oil_date text default '',
    last_weekly_report_date text default '',
    pending_draft jsonb,
    updated_at timestamptz default now(),
    constraint bot_settings_single_row check (id = 1)
);

insert into public.bot_settings (
    id,
    daily_goal,
    weekly_trips_goal,
    monthly_goal,
    engine_oil_interval_km,
    last_engine_oil_odo,
    gear_oil_interval_km,
    last_gear_oil_odo
)
values (1, 400, 45, 8000, 2500, 0, 5000, 0)
on conflict (id) do nothing;

alter table public.bot_settings enable row level security;

drop policy if exists "Authenticated users can read bot settings" on public.bot_settings;
drop policy if exists "Admins can manage bot settings" on public.bot_settings;

create policy "Authenticated users can read bot settings"
    on public.bot_settings for select to authenticated using (true);

create policy "Admins can manage bot settings"
    on public.bot_settings for all to authenticated
    using (public.is_app_admin())
    with check (public.is_app_admin());
