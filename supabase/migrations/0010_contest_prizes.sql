-- Premios y reglamento por convocatoria.
--
-- Los reglamentos venían como PDF fijo: cambiar el premio del primer
-- lugar de $1,000 a $2,000 obligaba a rehacer el documento a mano. Ahora
-- el texto se genera desde estos datos, así que cambiar el número en el
-- panel cambia el reglamento que lee el participante.
--
-- "prize_categories" es un arreglo de categorías, porque los concursos
-- reales tienen más de una premiación independiente (Grupal/Individual
-- en dance cover, Adultos/Niños en cosplay), cada una con su cuota de
-- entrada y sus lugares:
--
-- [
--   { "label": "Modalidad Grupal", "entryFee": 70, "slots": 10,
--     "places": [ { "cash": 1000, "percent": 30, "other": "" } ] }
-- ]
--
-- Cada lugar puede llevar dinero, un porcentaje de lo recaudado en esa
-- categoría, un premio en especie, o cualquier combinación.

alter table contests
  -- Día concreto de la edición en el que se hace el concurso.
  add column day date,
  add column prize_categories jsonb not null default '[]'::jsonb,
  -- Avisos extra que el organizador quiera meter al reglamento.
  add column regulation_notes text;

-- Un tipo más: los torneos de videojuegos no son lo mismo que los de
-- cartas y su reglamento es otro.
alter table contests drop constraint if exists contests_type_check;
alter table contests add constraint contests_type_check
  check (type in ('dance_cover', 'cosplay', 'tcg', 'videojuegos', 'otro'));

-- Igual que los expositores: quien se inscribe acepta el reglamento, y
-- queda registrado que lo hizo.
alter table contest_entries
  add column reglamento_accepted boolean not null default false,
  add column reglamento_accepted_at timestamptz;
