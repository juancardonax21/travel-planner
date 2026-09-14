-- El ancla del día.
--
-- Cada día del viaje tiene una cosa que se va a recordar: el Fuji al
-- amanecer, las 108 campanadas, los tiburones ballena. No es lo mismo que
-- las notas del día, que son un bloc para "comprar pilas" o "llamar al
-- ryokan", así que va en su propia columna y no mezclada con ellas.
--
-- Va en day_notes porque esa tabla ya es "una fila por día del viaje", con
-- su unique(trip_id, day). No hace falta una tabla nueva.

alter table public.day_notes add column if not exists ancla text;
