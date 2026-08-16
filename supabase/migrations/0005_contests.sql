-- Convocatorias (concursos) por edición: dance cover, cosplay, torneos
-- TCG, etc. Cada edición habilita las que quiera, con su propio cupo y
-- su propia fecha límite. Los campos que pide cada tipo viven en el
-- código (src/lib/contestTypes.ts) y las respuestas se guardan en
-- "answers" para no tener que migrar la tabla cada vez que cambie una
-- pregunta.

create table contests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  type text not null check (type in ('dance_cover', 'cosplay', 'tcg', 'otro')),
  name text not null,
  description text,
  -- null = sin límite de inscritos.
  max_entries integer check (max_entries is null or max_entries > 0),
  -- null = se cierra cuando el admin lo decida, no por fecha.
  registration_deadline date,
  is_open boolean not null default true,
  -- Denormalizado a propósito: la página pública usa la anon key y
  -- contest_entries no es legible para nadie salvo el servidor, así que
  -- sin este contador no habría manera de mostrar "quedan 3 lugares".
  entries_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index contests_event_id_idx on contests(event_id);

alter table contests enable row level security;

create policy "contests are publicly readable"
  on contests for select
  using (true);

create table contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  -- Arranca en 5000 para que un folio de concurso nunca se confunda con
  -- uno de expositor (esos van desde 1000).
  folio_number bigint generated always as identity (start with 5000) unique,
  participant_name text not null,
  phone text not null,
  email text,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contest_entries_contest_id_idx on contest_entries(contest_id);
create index contest_entries_event_id_idx on contest_entries(event_id);

-- Sin políticas: los datos de contacto de los participantes sólo se leen
-- desde el servidor con la service role key, igual que "registrations".
alter table contest_entries enable row level security;

-- ---------------------------------------------------------------------
-- El contador se mantiene solo, así el admin puede borrar inscripciones
-- sin que "lugares libres" quede mintiendo.
-- ---------------------------------------------------------------------
create or replace function sync_contest_entries_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update contests set entries_count = entries_count + 1
      where id = new.contest_id;
    return new;
  else
    update contests set entries_count = greatest(entries_count - 1, 0)
      where id = old.contest_id;
    return old;
  end if;
end;
$$;

create trigger contest_entries_count_ins
  after insert on contest_entries
  for each row execute function sync_contest_entries_count();

create trigger contest_entries_count_del
  after delete on contest_entries
  for each row execute function sync_contest_entries_count();

-- ---------------------------------------------------------------------
-- register_contest_entry(): inscribe respetando el cupo.
--
-- El "for update" sobre la convocatoria serializa las inscripciones de
-- esa convocatoria: sin él, dos personas que mandan el formulario a la
-- vez pueden pasar los dos el chequeo de cupo y meter un lugar de más.
-- ---------------------------------------------------------------------
create or replace function register_contest_entry(
  p_contest_id uuid,
  p_participant_name text,
  p_phone text,
  p_email text,
  p_answers jsonb
) returns contest_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contest contests%rowtype;
  v_entry contest_entries%rowtype;
  v_today date := (now() at time zone 'America/Monterrey')::date;
begin
  select * into v_contest from contests where id = p_contest_id for update;

  if not found then
    raise exception 'CONTEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_contest.is_open then
    raise exception 'CONTEST_CLOSED' using errcode = 'P0001';
  end if;

  if v_contest.registration_deadline is not null
     and v_today > v_contest.registration_deadline then
    raise exception 'CONTEST_DEADLINE_PASSED' using errcode = 'P0001';
  end if;

  if v_contest.max_entries is not null
     and v_contest.entries_count >= v_contest.max_entries then
    raise exception 'CONTEST_FULL' using errcode = 'P0001';
  end if;

  insert into contest_entries (
    contest_id, event_id, participant_name, phone, email, answers
  ) values (
    p_contest_id, v_contest.event_id, p_participant_name, p_phone,
    p_email, coalesce(p_answers, '{}'::jsonb)
  ) returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function register_contest_entry(uuid, text, text, text, jsonb) from public;
grant execute on function register_contest_entry(uuid, text, text, text, jsonb)
  to anon, authenticated;
