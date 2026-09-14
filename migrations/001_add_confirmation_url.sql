-- Enlace a la confirmación de compra (resguardo de reserva cuando
-- los billetes todavía no están emitidos). Separado de ticket_url.
alter table public.events add column if not exists confirmation_url text;
