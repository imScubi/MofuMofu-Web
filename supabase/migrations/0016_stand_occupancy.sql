-- Un stand deja de tener UN estado y pasa a tenerlo por día y por lugar.
--
-- El problema: un expositor de un solo día apartaba el stand entero, y
-- el sábado siguiente nadie podía tomarlo aunque estuviera vacío. Lo
-- mismo con los espacios compartidos, que admiten dos negocios y se
-- comportaban como si admitieran uno.
--
-- La ocupación real vive en `registrations` — es el único lugar donde
-- consta quién va, qué día y con qué plan. `event_stands` se queda como
-- el candado de concurrencia y como resumen para el panel.

-- ---------------------------------------------------------------------
-- Qué días cubre un registro. Sin día elegido, cubre toda la edición.
-- ---------------------------------------------------------------------
create or replace function registration_days(
  p_participation_day date,
  p_date_start date,
  p_date_end date
) returns setof date
language sql
immutable
as $$
  -- Un UNION y no un CASE: Postgres no admite funciones que devuelven
  -- conjuntos dentro de un CASE.
  select p_participation_day
   where p_participation_day is not null
  union all
  select d::date
    from generate_series(p_date_start, p_date_end, interval '1 day') d
   where p_participation_day is null;
$$;

-- ---------------------------------------------------------------------
-- La ocupación que ve el mapa.
--
-- Devuelve sólo números de stand, días y si el lugar es compartido:
-- nada de nombres ni teléfonos. Por eso puede llamarla cualquiera desde
-- la página pública sin abrir la tabla de registros.
-- ---------------------------------------------------------------------
create or replace function stand_occupancy(p_event_id uuid)
returns table (stand_id text, day date, is_shared boolean, taken integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.stand_id,
    d::date as day,
    r.is_shared,
    count(*)::int as taken
  from registrations r
  join events e on e.id = r.event_id
  cross join lateral registration_days(
    r.participation_day, e.date_start, e.date_end
  ) d
  where r.event_id = p_event_id
    -- Un rechazado nunca entró y un cancelado ya se salió: su lugar
    -- vuelve al mapa.
    and r.status not in ('rejected', 'cancelled')
  group by r.stand_id, d, r.is_shared;
$$;

revoke all on function stand_occupancy(uuid) from public;
grant execute on function stand_occupancy(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- ¿Le queda lugar a este stand para alguien así?
--
-- La regla, por día:
--   · con un expositor exclusivo, el día está tomado;
--   · con compartidos, caben dos — y sólo entre compartidos: quien pide
--     el stand entero no puede meterse en un espacio que ya se comparte.
-- ---------------------------------------------------------------------
create or replace function stand_admits(
  p_event_id uuid,
  p_stand_id text,
  p_participation_day date,
  p_is_shared boolean
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_day date;
  v_exclusive int;
  v_shared int;
begin
  select * into v_event from events where id = p_event_id;
  if not found then
    return false;
  end if;

  if exists (
    select 1 from event_stands
     where event_id = p_event_id and stand_id = p_stand_id and status = 'blocked'
  ) then
    return false;
  end if;

  for v_day in
    select registration_days(p_participation_day, v_event.date_start, v_event.date_end)
  loop
    select
      count(*) filter (where not r.is_shared),
      count(*) filter (where r.is_shared)
      into v_exclusive, v_shared
    from registrations r
    where r.event_id = p_event_id
      and r.stand_id = p_stand_id
      and r.status not in ('rejected', 'cancelled')
      and (r.participation_day is null or r.participation_day = v_day);

    if v_exclusive > 0 then
      return false;
    end if;
    if v_shared > 0 and not p_is_shared then
      return false;
    end if;
    if v_shared >= 2 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- ¿Ya no cabe nadie más en este stand?
--
-- Lleno significa que NINGÚN día admite a nadie, ni siquiera medio
-- lugar compartido.
-- ---------------------------------------------------------------------
create or replace function stand_is_full(p_event_id uuid, p_stand_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_day date;
  v_exclusive int;
  v_shared int;
begin
  select * into v_event from events where id = p_event_id;
  if not found then
    return true;
  end if;

  for v_day in
    select registration_days(null, v_event.date_start, v_event.date_end)
  loop
    select
      count(*) filter (where not r.is_shared),
      count(*) filter (where r.is_shared)
      into v_exclusive, v_shared
    from registrations r
    where r.event_id = p_event_id
      and r.stand_id = p_stand_id
      and r.status not in ('rejected', 'cancelled')
      and (r.participation_day is null or r.participation_day = v_day);

    -- Este día todavía tiene sitio, así que el stand no está lleno.
    if v_exclusive = 0 and v_shared < 2 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- El resumen que enseña el panel.
--
-- "Disponible" pasa a significar "todavía admite a alguien", que es lo
-- que le importa a quien mira el mapa. Un stand con un expositor de un
-- solo día sigue disponible, porque el otro día está libre.
-- ---------------------------------------------------------------------
create or replace function refresh_stand_status(p_event_id uuid, p_stand_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_alive int;
  v_approved int;
begin
  if exists (
    select 1 from event_stands
     where event_id = p_event_id and stand_id = p_stand_id and status = 'blocked'
  ) then
    return;
  end if;

  select count(*), count(*) filter (where status = 'approved')
    into v_alive, v_approved
  from registrations
  where event_id = p_event_id
    and stand_id = p_stand_id
    and status not in ('rejected', 'cancelled');

  if v_alive = 0 or not stand_is_full(p_event_id, p_stand_id) then
    v_status := 'available';
  elsif v_approved = v_alive then
    v_status := 'sold';
  else
    v_status := 'pending';
  end if;

  update event_stands
     set status = v_status, updated_at = now()
   where event_id = p_event_id and stand_id = p_stand_id;
end;
$$;

-- reserve_stand(): ahora valida por día y por lugar compartido.
--
-- El candado sigue siendo la fila de event_stands, tomada con FOR
-- UPDATE: dos personas que apuntan al mismo stand a la vez se forman, y
-- la segunda ve la ocupación que dejó la primera. Antes el candado y la
-- regla eran la misma cosa (status = 'available'), y por eso no había
-- forma de expresar "libre sólo el domingo".
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
  p_product_details text,
  p_logo_path text,
  p_participation_day date,
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

  -- El candado: a partir de aquí nadie más toca este stand hasta que
  -- termine la transacción.
  select * into v_stand
    from event_stands
   where event_id = p_event_id and stand_id = p_stand_id
     for update;

  if not found then
    raise exception 'STAND_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if not stand_admits(p_event_id, p_stand_id, p_participation_day, p_is_shared) then
    raise exception 'STAND_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into registrations (
    event_id, stand_id, business_name, contact_name, phone, email,
    instagram, facebook, tiktok, other_social, business_category,
    product_details, logo_path, participation_day,
    needs_electricity, electricity_details, needs_gas, gas_details,
    amount_reported, payment_proof_path, payment_proof_path_2,
    plan_id, plan_label, plan_price, is_shared,
    reglamento_accepted, reglamento_accepted_at, restricted_giros_accepted
  ) values (
    p_event_id, p_stand_id, p_business_name, p_contact_name, p_phone, p_email,
    p_instagram, p_facebook, p_tiktok, p_other_social, p_business_category,
    p_product_details, p_logo_path, p_participation_day,
    p_needs_electricity, p_electricity_details, p_needs_gas, p_gas_details,
    p_amount_reported, p_payment_proof_path, p_payment_proof_path_2,
    p_plan_id, p_plan_label, p_plan_price, p_is_shared,
    p_reglamento_accepted, now(), p_restricted_giros_accepted
  ) returning * into v_reg;

  perform refresh_stand_status(p_event_id, p_stand_id);

  return v_reg;
end;
$$;
