-- Room availability ratings (thumbs up / down)
-- Run this in the Supabase SQL editor (after comments.sql — needs profiles).

-- ---------------------------------------------------------------------------
-- room_ratings
--   One vote per user per room; voting again with the same value removes the
--   vote, voting the other way flips it (the app upserts on the unique pair).
--   classrooms rows are upserted (never deleted) by the scraper, so the FK
--   is stable across scrape runs.
-- ---------------------------------------------------------------------------
create table if not exists room_ratings (
    id           uuid primary key default gen_random_uuid(),
    classroom_id uuid not null references classrooms (id) on delete cascade,
    user_id      uuid not null references profiles (id) on delete cascade,
    is_positive  boolean not null,
    created_at   timestamptz not null default now(),
    unique (classroom_id, user_id)
);

create index if not exists idx_room_ratings_classroom
    on room_ratings (classroom_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: counts are public; users manage only their own vote.
-- ---------------------------------------------------------------------------
alter table room_ratings enable row level security;

drop policy if exists "public read" on room_ratings;
create policy "public read" on room_ratings
    for select to anon, authenticated using (true);
drop policy if exists "insert own" on room_ratings;
create policy "insert own" on room_ratings
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own" on room_ratings;
create policy "update own" on room_ratings
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own" on room_ratings;
create policy "delete own" on room_ratings
    for delete to authenticated using (auth.uid() = user_id);
