-- Marca de "fecha u hora que no admite cambio".
-- Hasta ahora se deducía de que la nota empezara por ⚠, lo que se rompía
-- en cuanto se editaba el texto. Pasa a ser una columna propia.
alter table public.events add column if not exists fixed_time boolean default false;

-- Traspaso: la importación del plan de Japón dejó la marca dentro de la nota.
update public.events
   set fixed_time = true
 where note like '%⚠ Fecha u hora que no admite cambio%';

-- Y se limpia el texto, en cualquiera de las tres posiciones en que quedó.
update public.events
   set note = replace(note, ' · ⚠ Fecha u hora que no admite cambio', '')
 where note like '%⚠ Fecha u hora que no admite cambio%';

update public.events
   set note = replace(note, '⚠ Fecha u hora que no admite cambio · ', '')
 where note like '%⚠ Fecha u hora que no admite cambio%';

update public.events
   set note = nullif(replace(note, '⚠ Fecha u hora que no admite cambio', ''), '')
 where note like '%⚠ Fecha u hora que no admite cambio%';
