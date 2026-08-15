-- El giro del selector es una categoría amplia ("Ropa y accesorios"): no
-- alcanza para saber si un negocio choca con un giro restringido o con
-- otro expositor de la misma edición. Ahora el expositor describe además
-- qué vende exactamente, y ese texto viaja al Excel.
--
-- La columna es nullable porque los registros que ya existían no la
-- tienen; el formulario sí la exige de aquí en adelante.
alter table registrations add column product_details text;

-- ---------------------------------------------------------------------
-- reserve_stand(): un parámetro más. Como cambia la firma, hay que
-- borrar explícitamente la versión anterior o quedarían las dos.
-- ---------------------------------------------------------------------
drop function if exists reserve_stand(
  uuid, text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric,
  boolean, boolean, boolean
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
  p_product_details text,
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
    product_details,
    needs_electricity, electricity_details, needs_gas, gas_details,
    amount_reported, payment_proof_path, payment_proof_path_2,
    plan_id, plan_label, plan_price, is_shared,
    reglamento_accepted, reglamento_accepted_at, restricted_giros_accepted
  ) values (
    p_event_id, p_stand_id, p_business_name, p_contact_name, p_phone, p_email,
    p_instagram, p_facebook, p_tiktok, p_other_social, p_business_category,
    p_product_details,
    p_needs_electricity, p_electricity_details, p_needs_gas, p_gas_details,
    p_amount_reported, p_payment_proof_path, p_payment_proof_path_2,
    p_plan_id, p_plan_label, p_plan_price, p_is_shared,
    p_reglamento_accepted, now(), p_restricted_giros_accepted
  ) returning * into v_reg;

  return v_reg;
end;
$$;

revoke all on function reserve_stand(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric,
  boolean, boolean, boolean
) from public;
grant execute on function reserve_stand(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  boolean, text, boolean, text, numeric, text, text, text, text, numeric,
  boolean, boolean, boolean
) to anon, authenticated;
