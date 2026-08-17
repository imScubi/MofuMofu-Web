-- Plan logístico: lo que hoy se arma a mano en un documento y hay que
-- rehacer cada vez que alguien cancela.
--
-- Tres piezas:
--   1. El logo del negocio, para que el plan y el mapa se lean de un
--      vistazo en vez de con una lista de nombres.
--   2. Qué día participa cada quien: el mismo número de stand puede
--      tener un negocio el sábado y otro el domingo.
--   3. El cronograma y el itinerario de cada edición.

alter table registrations
  add column logo_path text,
  -- null = participa todos los días de la edición. Con un plan de un
  -- solo día, aquí va la fecha que eligió.
  add column participation_day date;

-- "Cancelado" no es lo mismo que "rechazado": el rechazado nunca entró,
-- el cancelado ya estaba en el plan y deja un hueco que hay que
-- reacomodar. Se distinguen porque el plan los trata distinto.
alter table registrations drop constraint if exists registrations_status_check;
alter table registrations add constraint registrations_status_check
  check (status in ('pending_review', 'approved', 'rejected', 'cancelled'));

-- ---------------------------------------------------------------------
-- Cronograma e itinerario por edición
-- ---------------------------------------------------------------------
create table event_schedule (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  /** Día concreto de la edición al que pertenece el bloque. */
  day date not null,
  start_time time not null,
  /** Opcional: hay avisos que son una hora puntual, no un rango. */
  end_time time,
  title text not null,
  notes text,
  /** "montaje" (logística interna) o "actividad" (lo que ve el público). */
  kind text not null default 'actividad'
    check (kind in ('montaje', 'actividad')),
  created_at timestamptz not null default now()
);

create index event_schedule_event_id_idx on event_schedule(event_id, day, start_time);

-- El itinerario se publica: cualquiera puede leerlo.
alter table event_schedule enable row level security;

create policy "event_schedule is publicly readable"
  on event_schedule for select
  using (true);
