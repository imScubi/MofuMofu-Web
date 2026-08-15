-- Múltiples ediciones del evento ("eventos"). Cada edición tiene sus
-- propias fechas, fecha límite de pago, y puede activar/desactivar la
-- lista de giros restringidos. La disponibilidad de cada stand pasa a
-- ser por edición (event_stands), ya no global (stands.status).

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_start date not null,
  date_end date not null,
  payment_deadline date not null,
  restricted_giros_enabled boolean not null default false,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "events are publicly readable"
  on events for select
  using (true);

-- Edición inicial, a partir de la configuración que ya estaba en
-- eventConfig.ts, para no dejar huérfano el registro que ya existe.
insert into events (name, date_start, date_end, payment_deadline, restricted_giros_enabled, is_open)
values ('Edición Octubre 2026', '2026-10-24', '2026-10-25', '2026-10-09', false, true);

-- ---------------------------------------------------------------------
-- event_stands: disponibilidad de cada stand, por edición
-- ---------------------------------------------------------------------
create table event_stands (
  event_id uuid not null references events(id) on delete cascade,
  stand_id text not null references stands(id),
  status text not null default 'available'
    check (status in ('available', 'pending', 'sold', 'blocked')),
  updated_at timestamptz not null default now(),
  primary key (event_id, stand_id)
);

alter table event_stands enable row level security;

create policy "event_stands are publicly readable"
  on event_stands for select
  using (true);

alter publication supabase_realtime add table event_stands;

-- Sembrar la edición inicial con el estado que ya tenían los stands.
insert into event_stands (event_id, stand_id, status)
select (select id from events order by created_at limit 1), id, status
from stands
where reservable = true;

-- ---------------------------------------------------------------------
-- registrations: edición, folio corto, aceptación de reglamento/giros
-- ---------------------------------------------------------------------
alter table registrations add column event_id uuid references events(id);
update registrations set event_id = (select id from events order by created_at limit 1);
alter table registrations alter column event_id set not null;

alter table registrations
  add column folio_number bigint generated always as identity (start with 1000) unique,
  add column reglamento_accepted boolean not null default false,
  add column reglamento_accepted_at timestamptz,
  add column restricted_giros_accepted boolean not null default false;

create index if not exists registrations_event_id_idx on registrations(event_id);

-- ---------------------------------------------------------------------
-- reserve_stand(): ahora recibe event_id y las aceptaciones, y opera
-- sobre event_stands en vez de stands directamente.
-- ---------------------------------------------------------------------
drop function if exists reserve_stand(
  text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric, boolean
);

create or replace function reserve_stand(
  p_event_id uuid,
  p_stand_id text,
  p_business_name text,
  p_contact_name text,
  p_phone text,
  p_email text,
  p_instagram text,
  p_facebook text,
  p_tiktok text,
  p_other_social text,
  p_business_category text,
  p_needs_electricity boolean,
  p_electricity_details text,
  p_needs_gas boolean,
  p_gas_details text,
  p_amount_reported numeric,
  p_payment_proof_path text,
  p_payment_proof_path_2 text,
  p_plan_id text,
  p_plan_label text,
  p_plan_price numeric,
  p_is_shared boolean,
  p_reglamento_accepted boolean,
  p_restricted_giros_accepted boolean
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stand event_stands%rowtype;
  v_reg registrations%rowtype;
begin
  if not p_reglamento_accepted then
    raise exception 'REGLAMENTO_NOT_ACCEPTED' using errcode = 'P0001';
  end if;

  update event_stands
    set status = 'pending', updated_at = now()
    where event_id = p_event_id
      and stand_id = p_stand_id
      and status = 'available'
    returning * into v_stand;

  if not found then
    raise exception 'STAND_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into registrations (
    event_id, stand_id, business_name, contact_name, phone, email,
    instagram, facebook, tiktok, other_social, business_category,
    needs_electricity, electricity_details, needs_gas, gas_details,
    amount_reported, payment_proof_path, payment_proof_path_2,
    plan_id, plan_label, plan_price, is_shared,
    reglamento_accepted, reglamento_accepted_at, restricted_giros_accepted
  ) values (
    p_event_id, p_stand_id, p_business_name, p_contact_name, p_phone, p_email,
    p_instagram, p_facebook, p_tiktok, p_other_social, p_business_category,
    p_needs_electricity, p_electricity_details, p_needs_gas, p_gas_details,
    p_amount_reported, p_payment_proof_path, p_payment_proof_path_2,
    p_plan_id, p_plan_label, p_plan_price, p_is_shared,
    p_reglamento_accepted, now(), p_restricted_giros_accepted
  ) returning * into v_reg;

  return v_reg;
end;
$$;

revoke all on function reserve_stand(
  uuid, text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric, boolean, boolean, boolean
) from public;
grant execute on function reserve_stand(
  uuid, text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric, boolean, boolean, boolean
) to anon, authenticated;
