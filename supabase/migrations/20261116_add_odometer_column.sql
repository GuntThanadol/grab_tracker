-- ========================================================
-- ADD ODOMETER COLUMN FOR MOTORCYCLE DASHBOARD MILEAGE (KM)
-- ========================================================

alter table public.entries
add column if not exists odometer numeric(10,1);
