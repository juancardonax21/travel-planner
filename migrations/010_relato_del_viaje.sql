-- El relato del viaje.
--
-- Las anclas dicen qué es lo que no se olvida de cada día. Falta lo de
-- arriba: por qué este viaje concreto es este y no otro, cómo se reparte en
-- etapas y qué lo sostiene. Eso no se deduce de la lista de eventos.
--
-- Se enseña al abrir el plan general, antes que ninguna etapa.

alter table public.trips add column if not exists relato text;
