begin;

-- InGiDay: admin-only production costs for every product and variant combination.
-- This migration only creates storage. No existing order is changed or backfilled.
-- Snapshot population and reporting are implemented in later, separately tested steps.

create table public.production_cost_settings (
  id smallint primary key default 1 check (id = 1),
  filament_price_per_kg numeric(12, 2) not null default 150000
    check (filament_price_per_kg >= 0),
  average_printer_power_watts numeric(12, 2)
    check (average_printer_power_watts is null or average_printer_power_watts >= 0),
  electricity_price_per_kwh numeric(12, 2)
    check (electricity_price_per_kwh is null or electricity_price_per_kwh >= 0),
  packaging_cost_per_order numeric(12, 2) not null default 10000
    check (packaging_cost_per_order >= 0),
  shipping_cost_per_order numeric(12, 2) not null default 15000
    check (shipping_cost_per_order >= 0),
  updated_at timestamptz not null default now()
);

insert into public.production_cost_settings (id) values (1);

create trigger trg_production_cost_settings_updated_at
before update on public.production_cost_settings
for each row execute function public.set_updated_at();

create table public.product_production_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  selections jsonb not null default '{}'::jsonb
    check (jsonb_typeof(selections) = 'object'),
  filament_grams numeric(12, 2) not null check (filament_grams >= 0),
  print_minutes integer not null check (print_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, selections)
);

create index product_production_cost_profiles_product_id_idx
on public.product_production_cost_profiles (product_id);

create trigger trg_product_production_cost_profiles_updated_at
before update on public.product_production_cost_profiles
for each row execute function public.set_updated_at();

-- A saved per-unit cost must survive later changes to filament/electricity prices.
-- Missing electricity settings remain NULL, never silently become free electricity.
create table public.order_item_production_cost_snapshots (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  source_profile_id uuid references public.product_production_cost_profiles(id)
    on delete set null,
  filament_grams numeric(12, 2) not null check (filament_grams >= 0),
  print_minutes integer not null check (print_minutes >= 0),
  filament_price_per_kg numeric(12, 2) not null check (filament_price_per_kg >= 0),
  average_printer_power_watts numeric(12, 2)
    check (average_printer_power_watts is null or average_printer_power_watts >= 0),
  electricity_price_per_kwh numeric(12, 2)
    check (electricity_price_per_kwh is null or electricity_price_per_kwh >= 0),
  filament_cost_per_unit numeric(12, 0) not null check (filament_cost_per_unit >= 0),
  electricity_cost_per_unit numeric(12, 0)
    check (electricity_cost_per_unit is null or electricity_cost_per_unit >= 0),
  total_cost_per_unit numeric(12, 0)
    check (total_cost_per_unit is null or total_cost_per_unit >= 0),
  captured_at timestamptz not null default now(),
  check (
    (electricity_cost_per_unit is null and total_cost_per_unit is null)
    or (
      electricity_cost_per_unit is not null
      and total_cost_per_unit = filament_cost_per_unit + electricity_cost_per_unit
    )
  )
);

-- Per-order handling snapshots apply to ALL orders (not just completed orders).
-- They are separate from the shipping fee CHARGED to the customer.
create table public.order_handling_cost_snapshots (
  order_id uuid primary key references public.orders(id) on delete cascade,
  packaging_cost numeric(12, 0) not null check (packaging_cost >= 0),
  shipping_cost numeric(12, 0) not null check (shipping_cost >= 0),
  captured_at timestamptz not null default now()
);

alter table public.production_cost_settings enable row level security;
alter table public.product_production_cost_profiles enable row level security;
alter table public.order_item_production_cost_snapshots enable row level security;
alter table public.order_handling_cost_snapshots enable row level security;

-- Product cost data must NEVER be exposed to public/anonymous storefront reads.
revoke all on table
  public.production_cost_settings,
  public.product_production_cost_profiles,
  public.order_item_production_cost_snapshots,
  public.order_handling_cost_snapshots
from public, anon, authenticated;

create policy production_cost_settings_admin_all
on public.production_cost_settings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy product_production_cost_profiles_admin_all
on public.product_production_cost_profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy order_item_production_cost_snapshots_admin_select
on public.order_item_production_cost_snapshots for select to authenticated
using (public.is_admin());

create policy order_handling_cost_snapshots_admin_select
on public.order_handling_cost_snapshots for select to authenticated
using (public.is_admin());

grant select, insert, update, delete on
  public.production_cost_settings,
  public.product_production_cost_profiles
  to authenticated;

grant select on
  public.order_item_production_cost_snapshots,
  public.order_handling_cost_snapshots
  to authenticated;

grant select, insert, update, delete on
  public.production_cost_settings,
  public.product_production_cost_profiles,
  public.order_item_production_cost_snapshots,
  public.order_handling_cost_snapshots
  to service_role;

comment on table public.production_cost_settings is
  'Private admin production prices: filament, printer power, electricity, packaging and outbound shipping.';
comment on table public.product_production_cost_profiles is
  'Private per-product or exact combination of variant option IDs: grams and print minutes.';
comment on table public.order_item_production_cost_snapshots is
  'Private per-unit manufacturing cost at sale time; empty until order snapshot logic is deployed.';
comment on table public.order_handling_cost_snapshots is
  'Private packaging and outbound shipping costs for all orders; empty until order snapshot logic is deployed.';

commit;
