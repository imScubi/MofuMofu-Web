-- Resultados del test de personaje.
--
-- No guarda nada de quien contesta: sólo qué personaje le tocó y su
-- código de cuatro letras. Sirve para dos cosas — poder decirle "eres
-- parte del 9% que salió Charmy", que es la mitad de la gracia, y para
-- que el organizador sepa de verdad cómo es su público.
create table quiz_results (
  id uuid primary key default gen_random_uuid(),
  character_id text not null,
  code text not null check (code ~ '^[FR][CM][VP][GT]$'),
  created_at timestamptz not null default now()
);

create index quiz_results_character_idx on quiz_results(character_id);
create index quiz_results_created_at_idx on quiz_results(created_at);

-- Sin políticas: se escribe y se lee desde el servidor. El conteo
-- público sale por una ruta propia, no abriendo la tabla.
alter table quiz_results enable row level security;
