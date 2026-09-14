-- Esquema de la base de datos (Supabase / Postgres).
--
-- Tablas, columnas, tipos y defaults introspectados de la base real.
-- Las reglas ON DELETE de las claves foráneas, las políticas RLS y el bucket
-- de storage no son introspectables por esa vía y se mantienen tal como se
-- definieron originalmente.
--
-- Cambios de esquema posteriores: ver migrations/.

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- trips
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  destination text not null,
  country_code text,
  start_date date not null,
  end_date date not null,
  currency text default 'USD',
  currency_sym text default '$',
  exchange_base text default 'EUR',
  exchange_rate numeric default 1.08,
  cover_image text,
  created_at timestamp with time zone default now(),
  entry_requirements jsonb,
  must_do jsonb
);

-- family_members
create table public.family_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  birthdate date,
  email text,
  phone text,
  dni text,
  passport_number text,
  passport_issue date,
  passport_expiry date,
  esta_number text,
  esta_expiry date,
  tse_number text,
  tse_expiry date,
  health_ins_number text,
  health_ins_expiry date,
  health_ins_phone text,
  drive_license text,
  drive_license_expiry date,
  created_at timestamp with time zone default now(),
  entry_permits jsonb,
  vaccines jsonb,
  dni_expiry date
);

-- trip_members
create table public.trip_members (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade,
  family_member_id uuid references public.family_members(id) on delete cascade,
  travel_ins_number text,
  travel_ins_expiry date,
  travel_ins_phone text,
  cancel_ins_number text,
  cancel_ins_expiry date
);

-- member_documents
create table public.member_documents (
  id uuid default gen_random_uuid() primary key,
  family_member_id uuid references public.family_members(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  type text not null,
  label text,
  file_url text,
  file_name text,
  created_at timestamp with time zone default now()
);

-- events
create table public.events (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date not null,
  time time without time zone default '09:00:00' not null,
  title text not null,
  category text default 'other' not null,
  location text,
  lat numeric,
  lng numeric,
  note text,
  cost numeric default 0,
  url text,
  budget_item_id uuid,
  airline text,
  flight_number text,
  from_airport text,
  to_airport text,
  dep_time time without time zone,
  arr_time time without time zone,
  arr_day date,
  terminal text,
  created_at timestamp with time zone default now(),
  connection_from text,
  connection_duration text,
  arr_terminal text,
  ticket_url text,
  insurance_url text,
  flight_segments jsonb,
  num_stops integer default 0,
  accom_type text,
  accom_booking_ref text,
  accom_pin text,
  accom_checkin_date date,
  accom_checkin_time time without time zone,
  accom_checkout_date date,
  accom_checkout_time time without time zone,
  accom_guests_adults integer,
  accom_guests_children integer,
  accom_address text,
  accom_web text,
  accom_cancel_date date,
  accom_cancel_fee text,
  accom_notes text,
  currency text,
  paid boolean default false,
  accom_phone text,
  accom_room text,
  accom_parking_info text,
  accom_breakfast boolean default false,
  accom_parking_included boolean default false,
  accom_pool boolean default false,
  accom_wifi boolean default false,
  accom_ac boolean default false,
  accom_pets boolean default false,
  end_time time without time zone,
  travel_mode text default 'driving',
  confirmation_url text
);

-- day_notes
create table public.day_notes (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date not null,
  content text default '' not null,
  updated_at timestamp with time zone default now(),
  unique(trip_id, day)
);

-- documents
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null,
  category text default 'otros' not null,
  expiry date,
  url text,
  budget_item_id uuid,
  note text,
  created_at timestamp with time zone default now()
);

-- photos
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date,
  url text not null,
  caption text,
  storage_path text not null,
  created_at timestamp with time zone default now()
);

-- budget_items
create table public.budget_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  category text default 'other' not null,
  description text not null,
  amount numeric default 0,
  paid boolean default false,
  checkin date,
  checkout date,
  cancel_before date,
  url text,
  created_at timestamp with time zone default now()
);

-- checklist_items
create table public.checklist_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  group_name text default 'General' not null,
  text text not null,
  done boolean default false,
  url text,
  created_at timestamp with time zone default now()
);

-- travelers
create table public.travelers (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null,
  birthdate date,
  email text,
  phone text,
  passport_number text,
  passport_expiry date,
  passport_issue date,
  dni text,
  esta_number text,
  esta_expiry date,
  created_at timestamp with time zone default now(),
  tse_number text,
  tse_expiry date,
  health_ins_number text,
  health_ins_expiry date,
  health_ins_phone text,
  drive_license text,
  drive_license_expiry date
);

-- ── RLS ──
alter table public.trips enable row level security;
alter table public.family_members enable row level security;
alter table public.trip_members enable row level security;
alter table public.member_documents enable row level security;
alter table public.events enable row level security;
alter table public.day_notes enable row level security;
alter table public.documents enable row level security;
alter table public.photos enable row level security;
alter table public.budget_items enable row level security;
alter table public.checklist_items enable row level security;
alter table public.travelers enable row level security;

create policy "Users own trips" on public.trips for all using (auth.uid() = user_id);
create policy "Users own family" on public.family_members for all using (auth.uid() = user_id);

create policy "Trips members" on public.trip_members for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips member docs" on public.member_documents for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
  or family_member_id in (select id from public.family_members where user_id = auth.uid())
);
create policy "Trips events" on public.events for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips day_notes" on public.day_notes for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips documents" on public.documents for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips photos" on public.photos for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips budget" on public.budget_items for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips checklist" on public.checklist_items for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips travelers" on public.travelers for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);

-- ── Storage ──
insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', true);
create policy "Photos public read" on storage.objects for select using (bucket_id = 'trip-photos');
create policy "Auth upload photos" on storage.objects for insert with check (bucket_id = 'trip-photos' and auth.role() = 'authenticated');
