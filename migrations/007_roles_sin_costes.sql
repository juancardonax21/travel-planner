-- Dos clases de invitado: quien lo ve todo y quien no ve el dinero.
--
-- El rol vive en trip_access.role:
--   'owner'       el propietario del viaje
--   'member'      invitado con acceso completo
--   'sin_costes'  invitado que no ve el presupuesto
--
-- Importante sobre el alcance: el presupuesto son filas propias y sí se puede
-- bloquear de verdad. Los importes de cada evento son una columna de events,
-- y las políticas de Postgres trabajan por filas, no por columnas: esos se
-- ocultan en la interfaz, que frena a un adolescente pero no a quien sepa
-- mirar la respuesta de la API. Para lo que es, compensa.

alter table public.trip_access drop constraint if exists trip_access_role_check;
alter table public.trip_access add constraint trip_access_role_check
  check (role in ('owner', 'member', 'sin_costes'));

-- ¿Puede esta persona ver el dinero de este viaje?
create or replace function public.ve_costes(t uuid) returns boolean as $$
  select exists (
    select 1 from public.trip_access
     where trip_id = t and user_id = auth.uid() and role <> 'sin_costes'
  );
$$ language sql security definer stable set search_path = public, pg_temp;

-- El presupuesto deja de verse para quien tiene el rol restringido.
drop policy if exists "Invitados usan budget_items" on public.budget_items;
create policy "Invitados usan budget_items" on public.budget_items for all
  using (public.ve_costes(trip_id));
