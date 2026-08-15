-- MofuMofu Market — esquema inicial
-- Stands del mapa, registros de expositores, reserva atómica y storage.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- STANDS
-- ---------------------------------------------------------------------
create table if not exists stands (
  id text primary key,
  price numeric(10, 2) not null default 2500,
  status text not null default 'available'
    check (status in ('available', 'pending', 'sold', 'blocked')),
  reservable boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Los 41 espacios del plano (1-40 + caseta de informes "A").
insert into stands (id, reservable, status)
select id::text, true, 'available'
from generate_series(1, 40) as id
on conflict (id) do nothing;

insert into stands (id, reservable, status, price)
values ('A', false, 'blocked', 0)
on conflict (id) do nothing;

alter table stands enable row level security;

create policy "stands are publicly readable"
  on stands for select
  using (true);

-- No se permiten INSERT/UPDATE/DELETE directos desde el cliente:
-- toda escritura pasa por la función reserve_stand() (security definer)
-- o por el panel admin (usa la service role key desde el servidor).

-- ---------------------------------------------------------------------
-- REGISTRATIONS
-- ---------------------------------------------------------------------
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  stand_id text not null references stands(id),
  business_name text not null,
  contact_name text not null,
  phone text not null,
  email text,
  instagram text,
  facebook text,
  tiktok text,
  other_social text,
  business_category text not null,
  needs_electricity boolean not null default false,
  electricity_details text,
  needs_gas boolean not null default false,
  gas_details text,
  amount_reported numeric(10, 2) not null default 0,
  payment_proof_path text not null,
  payment_proof_path_2 text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_stand_id_idx on registrations(stand_id);

alter table registrations enable row level security;
-- Sin políticas públicas: solo la función reserve_stand() (security definer)
-- puede insertar, y solo el servidor (service role) puede leer/editar
-- desde el panel admin. Protege los datos de contacto de los expositores.

-- ---------------------------------------------------------------------
-- Reserva atómica de un stand
-- ---------------------------------------------------------------------
create or replace function reserve_stand(
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
  p_payment_proof_path_2 text
) returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stand stands%rowtype;
  v_reg registrations%rowtype;
begin
  update stands
    set status = 'pending', updated_at = now()
    where id = p_stand_id
      and reservable = true
      and status = 'available'
    returning * into v_stand;

  if not found then
    raise exception 'STAND_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into registrations (
    stand_id, business_name, contact_name, phone, email,
    instagram, facebook, tiktok, other_social, business_category,
    needs_electricity, electricity_details, needs_gas, gas_details,
    amount_reported, payment_proof_path, payment_proof_path_2
  ) values (
    p_stand_id, p_business_name, p_contact_name, p_phone, p_email,
    p_instagram, p_facebook, p_tiktok, p_other_social, p_business_category,
    p_needs_electricity, p_electricity_details, p_needs_gas, p_gas_details,
    p_amount_reported, p_payment_proof_path, p_payment_proof_path_2
  ) returning * into v_reg;

  return v_reg;
end;
$$;

-- El anon key solo puede ejecutar la función, no tocar las tablas directo.
revoke all on function reserve_stand from public;
grant execute on function reserve_stand to anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime: el mapa necesita enterarse al instante cuando un stand cambia.
-- ---------------------------------------------------------------------
-- Solo "stands" es públicamente legible, así que solo esa tabla se
-- transmite por Realtime al navegador (anon key). "registrations" tiene
-- datos de contacto y RLS no le concede SELECT a anon, así que el panel
-- admin se refresca con router.refresh() en vez de una suscripción.
alter publication supabase_realtime add table stands;

-- ---------------------------------------------------------------------
-- Storage: capturas de comprobantes de pago
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Sin políticas públicas de storage: las capturas se suben y se leen
-- únicamente desde el servidor (service role key), nunca desde el navegador.
