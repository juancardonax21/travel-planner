-- Viajes compartidos: cada persona entra con su propia cuenta.
--
-- Hasta ahora un viaje solo lo veía su propietario, así que para que lo usara
-- la familia había que repartir una misma contraseña. Con esto, el propietario
-- genera un enlace, cada uno se da de alta con su correo y queda con acceso.
--
-- Las políticas nuevas se SUMAN a las que ya había: en Postgres las políticas
-- permisivas se combinan con OR, así que el propietario conserva su acceso por
-- la vía de siempre y no hace falta tocar nada de lo existente.

-- ── Quién tiene acceso a qué viaje ──
create table if not exists public.trip_access (
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member',
  created_at timestamp with time zone default now(),
  primary key (trip_id, user_id)
);
alter table public.trip_access enable row level security;

-- Cada uno ve sus propias filas, y el propietario las de su viaje.
drop policy if exists "Ve su propio acceso" on public.trip_access;
create policy "Ve su propio acceso" on public.trip_access for select using (
  user_id = auth.uid()
  or trip_id in (select id from public.trips where user_id = auth.uid())
);
-- Solo el propietario reparte o retira acceso. El alta por invitación la hace
-- el servidor con la clave de servicio, que se salta RLS.
drop policy if exists "El propietario reparte acceso" on public.trip_access;
create policy "El propietario reparte acceso" on public.trip_access for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);

-- Los propietarios actuales quedan registrados como tales.
insert into public.trip_access (trip_id, user_id, role)
select id, user_id, 'owner' from public.trips
on conflict (trip_id, user_id) do nothing;

-- ── Invitaciones ──
create table if not exists public.trip_invitations (
  token text primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  revoked boolean default false
);
alter table public.trip_invitations enable row level security;

drop policy if exists "El propietario gestiona invitaciones" on public.trip_invitations;
create policy "El propietario gestiona invitaciones" on public.trip_invitations for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);

-- ── Acceso de los invitados a los datos del viaje ──
-- Una función evita repetir la subconsulta y que se olvide en alguna tabla.
create or replace function public.tiene_acceso(t uuid) returns boolean as $$
  select exists (
    select 1 from public.trip_access
     where trip_id = t and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- El viaje en sí: los invitados lo leen, pero no lo modifican ni lo borran.
drop policy if exists "Invitados leen el viaje" on public.trips;
create policy "Invitados leen el viaje" on public.trips for select
  using (public.tiene_acceso(id));

-- El contenido del viaje: los invitados trabajan con él como uno más.
drop policy if exists "Invitados usan events" on public.events;
create policy "Invitados usan events" on public.events for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan day_notes" on public.day_notes;
create policy "Invitados usan day_notes" on public.day_notes for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan documents" on public.documents;
create policy "Invitados usan documents" on public.documents for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan photos" on public.photos;
create policy "Invitados usan photos" on public.photos for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan budget_items" on public.budget_items;
create policy "Invitados usan budget_items" on public.budget_items for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan checklist_items" on public.checklist_items;
create policy "Invitados usan checklist_items" on public.checklist_items for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan trip_members" on public.trip_members;
create policy "Invitados usan trip_members" on public.trip_members for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan member_documents" on public.member_documents;
create policy "Invitados usan member_documents" on public.member_documents for all using (public.tiene_acceso(trip_id));

drop policy if exists "Invitados usan travelers" on public.travelers;
create policy "Invitados usan travelers" on public.travelers for all using (public.tiene_acceso(trip_id));

-- Las fichas de los viajeros se leen si están asociadas a un viaje compartido.
-- Solo lectura: los datos personales los edita quien los creó.
drop policy if exists "Invitados leen la ficha de los viajeros" on public.family_members;
create policy "Invitados leen la ficha de los viajeros" on public.family_members for select using (
  id in (
    select tm.family_member_id from public.trip_members tm
     where public.tiene_acceso(tm.trip_id)
  )
);
