-- Tres cosas que hoy están fijas y deberían decidirse por edición:
-- qué lugares le tocan a cada giro, qué planes existen, y si alguien
-- paga menos.

-- ---------------------------------------------------------------------
-- Zonas: "del 30 al 35 sólo comida", "del 1 al 5 sólo artistas"
-- ---------------------------------------------------------------------
create table event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  /** Los stands que forman la zona, tal como aparecen en el mapa. */
  stand_ids text[] not null default '{}',
  /** Qué planes pueden ocupar esos lugares. */
  plan_ids text[] not null default '{}',
  /** Tope de expositores dentro de la zona. null = sólo lo limitan sus lugares. */
  max_exhibitors integer check (max_exhibitors is null or max_exhibitors > 0),
  created_at timestamptz not null default now()
);

create index event_zones_event_id_idx on event_zones(event_id);

-- La página de registro necesita saber qué lugar le toca a cada plan
-- antes de enviar nada, así que las zonas son de lectura pública. No
-- contienen datos de nadie: sólo números de stand y nombres de plan.
alter table event_zones enable row level security;

create policy "event_zones are publicly readable"
  on event_zones for select
  using (true);

-- ---------------------------------------------------------------------
-- Planes propios de la edición (por ejemplo "Artistas")
--
-- Los seis planes de siempre viven en el código; estos se suman sólo en
-- la edición donde se definan, con la misma forma:
--   [{ "id": "artistas_1", "categoryLabel": "Artistas", "days": 1,
--      "price": 1500, "shared": false }]
-- ---------------------------------------------------------------------
alter table events
  add column extra_plans jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------
-- Descuentos internos
--
-- Sin motivo: es una decisión del organizador, no algo que haya que
-- justificar en el sistema. Lo que sí importa es que el Excel distinga
-- el precio de lista de lo que realmente se va a cobrar.
-- ---------------------------------------------------------------------
alter table registrations
  add column discount_type text
    check (discount_type is null or discount_type in ('percent', 'amount')),
  add column discount_value numeric not null default 0
    check (discount_value >= 0);
