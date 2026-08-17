-- La sede cambia entre ediciones: no hay un parque fijo. Cada edición
-- guarda la suya y, si se deja vacía, la web usa la sede por defecto de
-- eventConfig.ts (la que más se ha usado).
--
-- Sirve para dos cosas: decirle a la gente dónde es sin que pregunte, y
-- darle a Google el lugar del evento, que es la mitad de una búsqueda
-- como "bazar kawaii en Monterrey".

alter table events
  add column venue_name text,
  add column venue_city text,
  add column venue_maps_url text;
