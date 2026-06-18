-- Enable RLS
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Trips
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
  created_at timestamptz default now()
);

-- Travelers
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
  created_at timestamptz default now()
);

-- Events
create table public.events (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date not null,
  time time not null default '09:00',
  title text not null,
  category text not null default 'other',
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
  dep_time time,
  arr_time time,
  arr_day date,
  terminal text,
  created_at timestamptz default now()
);

-- Budget items
create table public.budget_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  category text not null default 'other',
  description text not null,
  amount numeric default 0,
  paid boolean default false,
  checkin date,
  checkout date,
  cancel_before date,
  url text,
  created_at timestamptz default now()
);

-- Documents
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null,
  category text not null default 'otros',
  expiry date,
  url text,
  budget_item_id uuid,
  note text,
  created_at timestamptz default now()
);

-- Checklist
create table public.checklist_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  group_name text not null default 'General',
  text text not null,
  done boolean default false,
  url text,
  created_at timestamptz default now()
);

-- Day notes
create table public.day_notes (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date not null,
  content text not null default '',
  updated_at timestamptz default now(),
  unique(trip_id, day)
);

-- Photos
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day date,
  url text not null,
  caption text,
  storage_path text not null,
  created_at timestamptz default now()
);

-- RLS Policies (users only see their own trips)
alter table public.trips enable row level security;
alter table public.travelers enable row level security;
alter table public.events enable row level security;
alter table public.budget_items enable row level security;
alter table public.documents enable row level security;
alter table public.checklist_items enable row level security;
alter table public.day_notes enable row level security;
alter table public.photos enable row level security;

create policy "Users own trips" on public.trips for all using (auth.uid() = user_id);

create policy "Trips travelers" on public.travelers for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips events" on public.events for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips budget" on public.budget_items for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips documents" on public.documents for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips checklist" on public.checklist_items for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips day_notes" on public.day_notes for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);
create policy "Trips photos" on public.photos for all using (
  trip_id in (select id from public.trips where user_id = auth.uid())
);

-- Storage bucket for photos
insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', true);
create policy "Photos public read" on storage.objects for select using (bucket_id = 'trip-photos');
create policy "Auth upload photos" on storage.objects for insert with check (bucket_id = 'trip-photos' and auth.role() = 'authenticated');
