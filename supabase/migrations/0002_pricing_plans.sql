-- Planes de precio por registro (el precio ya no depende del stand,
-- depende del plan que elige el expositor: varios/comida x 1-2 días,
-- o el plan compartido).

alter table registrations
  add column plan_id text not null default 'varios_1',
  add column plan_label text not null default 'Expositores varios · 1 día',
  add column plan_price numeric(10, 2) not null default 0,
  add column is_shared boolean not null default false;

alter table registrations alter column plan_id drop default;
alter table registrations alter column plan_label drop default;
alter table registrations alter column plan_price drop default;

-- Se reemplaza la firma de la función (nuevos parámetros de plan), así
-- que hay que tumbar la versión vieja explícitamente: create-or-replace
-- no lo hace solo cuando cambia la lista de parámetros.
drop function if exists reserve_stand(
  text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text
);

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
  p_payment_proof_path_2 text,
  p_plan_id text,
  p_plan_label text,
  p_plan_price numeric,
  p_is_shared boolean
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
    amount_reported, payment_proof_path, payment_proof_path_2,
    plan_id, plan_label, plan_price, is_shared
  ) values (
    p_stand_id, p_business_name, p_contact_name, p_phone, p_email,
    p_instagram, p_facebook, p_tiktok, p_other_social, p_business_category,
    p_needs_electricity, p_electricity_details, p_needs_gas, p_gas_details,
    p_amount_reported, p_payment_proof_path, p_payment_proof_path_2,
    p_plan_id, p_plan_label, p_plan_price, p_is_shared
  ) returning * into v_reg;

  return v_reg;
end;
$$;

revoke all on function reserve_stand(
  text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric, boolean
) from public;
grant execute on function reserve_stand(
  text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric, boolean
) to anon, authenticated;
