-- La restricción travel_mode_check se creó a mano y no admitía 'train',
-- así que la opción "Tren" del formulario fallaba al guardar.
-- Se rehace con exactamente los valores que ofrece el selector.
alter table public.events drop constraint if exists travel_mode_check;
alter table public.events add constraint travel_mode_check
  check (travel_mode is null or travel_mode in
    ('driving', 'train', 'walking', 'bicycling', 'transit', 'flight', 'boat'));
