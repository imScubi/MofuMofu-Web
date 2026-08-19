-- Dar de baja a un expositor y devolverle su dinero.
--
-- Borrar el registro a secas deja las cuentas mintiendo: el Excel
-- olvida que ese dinero entró, y si el evento se quedó con una parte
-- (una penalización, la comisión del banco) esa parte desaparece
-- también. La baja se anota aquí antes de borrar, así queda el rastro
-- de cuánto había pagado y cuánto se le devolvió.
create table refunds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  /** Se copian del registro porque éste deja de existir. */
  folio_number integer not null,
  stand_id text not null,
  business_name text not null,
  contact_name text,
  phone text,
  plan_label text,
  /** Lo que el expositor había reportado pagado. */
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  /** Lo que se le devolvió. La diferencia es lo que retuvo el evento. */
  amount_refunded numeric not null default 0 check (amount_refunded >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index refunds_event_id_idx on refunds(event_id);

-- Sin políticas: son cuentas internas, sólo las toca el servidor con la
-- service role key.
alter table refunds enable row level security;
