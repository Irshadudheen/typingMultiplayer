create table public.typing_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_name text not null,
  duration_seconds integer not null default 60,
  passage text not null,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_rooms TO anon, authenticated;
GRANT ALL ON public.typing_rooms TO service_role;
ALTER TABLE public.typing_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON public.typing_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create rooms" ON public.typing_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.typing_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

create table public.typing_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.typing_rooms(id) on delete cascade,
  display_name text not null,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  wpm integer not null default 0,
  accuracy integer not null default 100,
  progress integer not null default 0,
  finished boolean not null default false,
  joined_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_players TO anon, authenticated;
GRANT ALL ON public.typing_players TO service_role;
ALTER TABLE public.typing_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view players" ON public.typing_players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can join rooms" ON public.typing_players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.typing_players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can leave rooms" ON public.typing_players FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_players;