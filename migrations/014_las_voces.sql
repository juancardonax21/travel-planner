-- Las voces: lo que dice cada uno sobre cada cosa del viaje.
--
-- Hasta ahora las notas colgaban del día, y nadie recuerda un día: se
-- recuerda una cosa que pasó. Nico no quiere escribir sobre el 27 de
-- diciembre, quiere decir algo sobre el taller de palillos. Así que la voz
-- se cuelga del evento.
--
-- Y la misma fila significa cosas distintas según cuándo se escriba, porque
-- la app sabe la fecha: antes del viaje un corazón son ganas y sirve para
-- decidir qué se queda; desde el día en adelante es veredicto, y los textos
-- son lo que pasó. Al final, todo junto y por orden, es el diario.
--
-- Quién firma: el viajero, no la cuenta. En esta familia cuatro personas
-- entran con dos cuentas, así que firmar con auth.uid() haría que todo lo de
-- los niños apareciera como de sus padres. El nombre se guarda copiado en la
-- fila (autor) para que el diario siga leyéndose aunque la ficha del viajero
-- se borre luego.

create table if not exists public.voces (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  -- La voz es de un evento o de un día entero. Una de las dos, no ninguna.
  event_id uuid references public.events(id) on delete cascade,
  day date,
  -- A quién se le atribuye, y cómo se llamaba cuando lo dijo.
  member_id uuid references public.family_members(id) on delete set null,
  autor text not null,
  tipo text not null check (tipo in ('corazon', 'nota')),
  texto text,
  -- Desde qué cuenta se escribió. No se enseña; sirve para saber quién puede
  -- borrarlo y para desenredar un día un malentendido.
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint voces_sitio check (event_id is not null or day is not null),
  constraint voces_nota_con_texto check (
    tipo <> 'nota' or coalesce(trim(texto), '') <> ''
  )
);

-- Un corazón por persona y por cosa: el segundo toque lo quita, no suma.
create unique index if not exists voces_un_corazon_por_evento
  on public.voces (event_id, member_id)
  where tipo = 'corazon' and event_id is not null;

create unique index if not exists voces_un_corazon_por_dia
  on public.voces (trip_id, day, member_id)
  where tipo = 'corazon' and day is not null;

create index if not exists voces_del_viaje on public.voces (trip_id, event_id);

alter table public.voces enable row level security;

-- Mismo criterio que el resto del contenido del viaje: quien tiene acceso al
-- viaje, habla y lee. Incluido el rol «sin costes», que no ve el dinero pero
-- sí el plan: precisamente son ellos los que más tienen que decir.
drop policy if exists "El viaje habla" on public.voces;
create policy "El viaje habla" on public.voces for all
  using (public.tiene_acceso(trip_id));

drop policy if exists "El propietario usa voces" on public.voces;
create policy "El propietario usa voces" on public.voces for all
  using (trip_id in (select id from public.trips where user_id = auth.uid()));
