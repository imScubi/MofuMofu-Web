-- Encuestas de retroalimentación por edición. El expositor las contesta
-- desde un link independiente (/encuesta/<token>) que no cuelga de
-- ningún otro flujo del sitio, y las respuestas son anónimas: no se
-- guarda nombre, teléfono ni folio, igual que en el Forms que se usaba
-- antes.
--
-- Las preguntas viven en el código (src/lib/surveyTemplates.ts), así que
-- crear la encuesta de la siguiente edición es un clic: mismas
-- preguntas, respuestas separadas.

create table surveys (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  -- Cuál juego de preguntas usa. Hoy sólo hay "expositores".
  template text not null default 'expositores',
  title text not null,
  intro text,
  -- Lo que va en la URL pública. Aleatorio y sin relación con el id,
  -- para que nadie llegue a una encuesta ajena probando números.
  public_token text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  is_open boolean not null default true,
  responses_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index surveys_event_id_idx on surveys(event_id);

-- Sin políticas: la página pública se arma en el servidor con la
-- service role key, así que la anon key nunca ve esta tabla.
alter table surveys enable row level security;

create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references surveys(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index survey_responses_survey_id_idx on survey_responses(survey_id);

alter table survey_responses enable row level security;

-- Contador al día aunque el admin borre respuestas sueltas.
create or replace function sync_survey_responses_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update surveys set responses_count = responses_count + 1
      where id = new.survey_id;
    return new;
  else
    update surveys set responses_count = greatest(responses_count - 1, 0)
      where id = old.survey_id;
    return old;
  end if;
end;
$$;

create trigger survey_responses_count_ins
  after insert on survey_responses
  for each row execute function sync_survey_responses_count();

create trigger survey_responses_count_del
  after delete on survey_responses
  for each row execute function sync_survey_responses_count();
