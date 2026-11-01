begin;

-- Cost snapshots are captured for NEW orders only.
-- Existing orders are not backfilled and must be labelled as missing historical snapshots.
-- The shipping cost is a shop expense and is distinct from orders.shipping_fee.

create or replace function public.capture_new_order_handling_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_settings public.production_cost_settings%rowtype;
begin
  select * into v_settings
  from public.production_cost_settings
  where id = 1;

  if not found then
    return new;
  end if;

  insert into public.order_handling_cost_snapshots (
    order_id, packaging_cost, shipping_cost
  ) values (
    new.id,
    round(v_settings.packaging_cost_per_order),
    round(v_settings.shipping_cost_per_order)
  ) on conflict (order_id) do nothing;

  return new;
end;
$function$;

create trigger trg_capture_new_order_handling_cost
  after insert on public.orders
  for each row
  execute function public.capture_new_order_handling_cost();

create or replace function public.capture_new_order_item_production_cost()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_settings public.production_cost_settings%rowtype;
  v_profile public.product_production_cost_profiles%rowtype;
  v_selections jsonb;
  v_total_variants integer;
  v_distinct_groups integer;
  v_filament_cost numeric;
  v_electricity_cost numeric;
  v_total_cost numeric;
begin
  -- Deleted/unconfigured products do not have a trusted manufacturing estimate.
  if new.product_id is null then
    return new;
  end if;

  -- The checkout RPC writes an array of {groupId, optionId} selections.
  if new.selected_variants is null
    or jsonb_typeof(new.selected_variants) <> 'array' then
    return new;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.selected_variants) as choice(value)
    where jsonb_typeof(choice.value) <> 'object'
      or nullif(btrim(choice.value ->> 'groupId'), '') is null
      or nullif(btrim(choice.value ->> 'optionId'), '') is null
  ) then
    return new;
  end if;

  select count(*), count(distinct choice.value ->> 'groupId')
    into v_total_variants, v_distinct_groups
  from jsonb_array_elements(new.selected_variants) as choice(value);

  if v_total_variants <> v_distinct_groups then
    return new;
  end if;

  select coalesce(
    jsonb_object_agg(choice.value ->> 'groupId', choice.value ->> 'optionId'),
    '{}'::jsonb
  ) into v_selections
  from jsonb_array_elements(new.selected_variants) as choice(value);

  select * into v_profile
  from public.product_production_cost_profiles
  where product_id = new.product_id
    and selections = v_selections;

  if not found then
    return new;
  end if;

  select * into v_settings
  from public.production_cost_settings
  where id = 1;

  if not found then
    return new;
  end if;

  -- Round each per-unit expense once. The TypeScript calculator uses the
  -- same non-negative rounding rule when inputs are within supported ranges.
  v_filament_cost := round(
    (v_profile.filament_grams / 1000) * v_settings.filament_price_per_kg
  );

  if v_settings.average_printer_power_watts is null
    or v_settings.electricity_price_per_kwh is null then
    v_electricity_cost := null;
    v_total_cost := null;
  else
    v_electricity_cost := round(
      (v_profile.print_minutes::numeric / 60)
      * (v_settings.average_printer_power_watts / 1000)
      * v_settings.electricity_price_per_kwh
    );
    v_total_cost := v_filament_cost + v_electricity_cost;
  end if;

  -- Never let an out-of-range cost figure overflow numeric(12,0) or block checkout.
  -- The missing snapshot remains detectable by the later profitability report.
  if v_filament_cost > 999999999999
    or coalesce(v_electricity_cost, 0) > 999999999999
    or coalesce(v_total_cost, 0) > 999999999999 then
    return new;
  end if;

  insert into public.order_item_production_cost_snapshots (
    order_item_id,
    source_profile_id,
    filament_grams,
    print_minutes,
    filament_price_per_kg,
    average_printer_power_watts,
    electricity_price_per_kwh,
    filament_cost_per_unit,
    electricity_cost_per_unit,
    total_cost_per_unit
  ) values (
    new.id,
    v_profile.id,
    v_profile.filament_grams,
    v_profile.print_minutes,
    v_settings.filament_price_per_kg,
    v_settings.average_printer_power_watts,
    v_settings.electricity_price_per_kwh,
    v_filament_cost,
    v_electricity_cost,
    v_total_cost
  ) on conflict (order_item_id) do nothing;

  return new;
end;
$function$;

create trigger trg_capture_new_order_item_production_cost
  after insert on public.order_items
  for each row
  execute function public.capture_new_order_item_production_cost();

-- The functions are invoked by database triggers, not via public RPC endpoints.
revoke all on function public.capture_new_order_handling_cost() from public, anon, authenticated;
revoke all on function public.capture_new_order_item_production_cost() from public, anon, authenticated;

comment on function public.capture_new_order_handling_cost() is
  'At order insertion, record actual shop packaging and outbound shipping estimates. All statuses count.';
comment on function public.capture_new_order_item_production_cost() is
  'At order item insertion, record private manufacturing costs for the exact selected variant combination.';

-- Preserve per-unit manufacturing history when an admin update replaces order_items.
-- The existing admin_update_order RPC deletes and reinserts rows even for unchanged items.
-- This transaction-local cache lives only until COMMIT and is never exposed via public tables.
-- Match original lines by order, product, selected variant IDs, and custom options.
-- Quantity can change: the original per-unit cost stays fixed, while reporting uses the new quantity.
-- Changed product/variant/customization gets a newly captured snapshot instead.

create or replace function public.stash_order_item_cost_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $cost$
begin
  if not exists (
    select 1 from public.order_item_production_cost_snapshots
    where order_item_id = old.id
  ) then
    return old;
  end if;

  create temporary table if not exists ingiday_order_cost_reinsert_cache (
    old_item_id uuid primary key,
    order_id uuid not null,
    product_id uuid,
    selected_variants jsonb not null,
    custom_options jsonb not null,
    source_profile_id uuid,
    filament_grams numeric(12, 2) not null,
    print_minutes integer not null,
    filament_price_per_kg numeric(12, 2) not null,
    average_printer_power_watts numeric(12, 2),
    electricity_price_per_kwh numeric(12, 2),
    filament_cost_per_unit numeric(12, 0) not null,
    electricity_cost_per_unit numeric(12, 0),
    total_cost_per_unit numeric(12, 0),
    captured_at timestamptz not null
  ) on commit drop;

  insert into pg_temp.ingiday_order_cost_reinsert_cache (
    old_item_id, order_id, product_id, selected_variants, custom_options,
    source_profile_id, filament_grams, print_minutes,
    filament_price_per_kg, average_printer_power_watts,
    electricity_price_per_kwh, filament_cost_per_unit,
    electricity_cost_per_unit, total_cost_per_unit, captured_at
  )
  select
    old.id, old.order_id, old.product_id,
    coalesce(old.selected_variants, '[]'::jsonb),
    coalesce(old.custom_options, '{}'::jsonb),
    s.source_profile_id, s.filament_grams, s.print_minutes,
    s.filament_price_per_kg, s.average_printer_power_watts,
    s.electricity_price_per_kwh, s.filament_cost_per_unit,
    s.electricity_cost_per_unit, s.total_cost_per_unit, s.captured_at
  from public.order_item_production_cost_snapshots as s
  where s.order_item_id = old.id
  on conflict (old_item_id) do nothing;

  return old;
end;
$cost$;

create trigger trg_stash_order_item_cost_before_delete
before delete on public.order_items
for each row
execute function public.stash_order_item_cost_before_delete();

create or replace function public.restore_order_item_cost_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $cost$
begin
  if to_regclass('pg_temp.ingiday_order_cost_reinsert_cache') is null then
    return new;
  end if;

  -- The existing trg_capture_new_order_item_production_cost trigger runs first
  -- (PostgreSQL orders triggers of the same kind alphabetically by name).
  -- Replace its fresh estimate only when we find the matching previous line.
  with prior as (
    select cache.old_item_id
    from pg_temp.ingiday_order_cost_reinsert_cache as cache
    where cache.order_id = new.order_id
      and cache.product_id is not distinct from new.product_id
      and cache.selected_variants = coalesce(new.selected_variants, '[]'::jsonb)
      and cache.custom_options = coalesce(new.custom_options, '{}'::jsonb)
    order by cache.old_item_id
    limit 1
    for update
  ), moved as (
    delete from pg_temp.ingiday_order_cost_reinsert_cache as cache
    where cache.old_item_id = (select prior.old_item_id from prior)
    returning cache.*
  )
  insert into public.order_item_production_cost_snapshots (
    order_item_id, source_profile_id, filament_grams, print_minutes,
    filament_price_per_kg, average_printer_power_watts,
    electricity_price_per_kwh, filament_cost_per_unit,
    electricity_cost_per_unit, total_cost_per_unit, captured_at
  )
  select
    new.id, moved.source_profile_id, moved.filament_grams, moved.print_minutes,
    moved.filament_price_per_kg, moved.average_printer_power_watts,
    moved.electricity_price_per_kwh, moved.filament_cost_per_unit,
    moved.electricity_cost_per_unit, moved.total_cost_per_unit, moved.captured_at
  from moved
  on conflict (order_item_id) do update set
    source_profile_id = excluded.source_profile_id,
    filament_grams = excluded.filament_grams,
    print_minutes = excluded.print_minutes,
    filament_price_per_kg = excluded.filament_price_per_kg,
    average_printer_power_watts = excluded.average_printer_power_watts,
    electricity_price_per_kwh = excluded.electricity_price_per_kwh,
    filament_cost_per_unit = excluded.filament_cost_per_unit,
    electricity_cost_per_unit = excluded.electricity_cost_per_unit,
    total_cost_per_unit = excluded.total_cost_per_unit,
    captured_at = excluded.captured_at;

  return new;
end;
$cost$;

create trigger trg_restore_order_item_cost_after_insert
after insert on public.order_items
for each row
execute function public.restore_order_item_cost_after_insert();

revoke all on function public.stash_order_item_cost_before_delete() from public, anon, authenticated;
revoke all on function public.restore_order_item_cost_after_insert() from public, anon, authenticated;

commit;
