-- Quién puede crear viajes.
--
-- A quien entra por una invitación se le comparte un viaje, no se le da una
-- herramienta de planificación: no debería poder crear los suyos.
--
-- Se hace con una política RESTRICTIVA. Las normales se combinan con OR, así
-- que añadir una más nunca quita permisos; las restrictivas se combinan con
-- AND y son las que sirven para recortar.

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  puede_crear_viajes boolean not null default true,
  created_at timestamp with time zone default now()
);
alter table public.app_users enable row level security;

-- Cada uno consulta su propia ficha; cambiarla es cosa del servidor.
drop policy if exists "Ve su propia ficha" on public.app_users;
create policy "Ve su propia ficha" on public.app_users for select
  using (user_id = auth.uid());

-- Sin ficha se puede crear: así nadie que ya usaba la aplicación se queda
-- fuera, y la restricción solo afecta a quien se marque expresamente.
create or replace function public.puede_crear_viajes() returns boolean as $$
  select coalesce(
    (select puede_crear_viajes from public.app_users where user_id = auth.uid()),
    true);
$$ language sql security definer stable set search_path = public, pg_temp;

drop policy if exists "Solo quien puede, crea viajes" on public.trips;
create policy "Solo quien puede, crea viajes" on public.trips
  as restrictive for insert
  with check (public.puede_crear_viajes());
