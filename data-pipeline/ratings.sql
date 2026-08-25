-- Room availability ratings (thumbs up / down)
-- Run this in the Supabase SQL editor (after comments.sql — needs profiles).

-- ---------------------------------------------------------------------------
-- room_ratings
--   One vote per user per room *per recurring free block*. A "block" is the
--   weekday + free window the room is in (block_start–block_end, e.g. the
--   1:00–2:30 PM gap between two classes on a Tuesday), scoped to the term. So
--   a vote confirming a room was free at 2 PM Tuesday counts only toward that
--   slot, and the tally resets when the schedule (semester) rolls over.
--   Voting again with the same value removes the vote, voting the other way
--   flips it (the app upserts on the unique tuple). classrooms rows are
--   upserted (never deleted) by the scraper, so the FK is stable across runs.
--
--   block_start/block_end are canonical "HH:MM" (24h) strings; the client
--   derives them from the surrounding classes and building hours.
-- ---------------------------------------------------------------------------
create table if not exists room_ratings (
    id           uuid primary key default gen_random_uuid(),
    classroom_id uuid not null references classrooms (id) on delete cascade,
    user_id      uuid not null references profiles (id) on delete cascade,
    is_positive  boolean not null,
    semester     text not null,
    day_of_week  smallint not null,
    block_start  text not null,
    block_end    text not null,
    created_at   timestamptz not null default now(),
    unique (classroom_id, user_id, semester, day_of_week, block_start, block_end)
);

create index if not exists idx_room_ratings_block
    on room_ratings (classroom_id, semester, day_of_week, block_start, block_end);

-- ---------------------------------------------------------------------------
-- Migration from the earlier all-time schema (unique (classroom_id, user_id),
-- no block columns). Run once on an existing table. The old rows carry no block
-- scope and can't be mapped to one, so they're dropped.
-- ---------------------------------------------------------------------------
-- truncate table room_ratings;
-- alter table room_ratings
--     add column if not exists semester    text,
--     add column if not exists day_of_week smallint,
--     add column if not exists block_start text,
--     add column if not exists block_end   text;
-- alter table room_ratings drop constraint if exists room_ratings_classroom_id_user_id_key;
-- alter table room_ratings add constraint room_ratings_block_user_key
--     unique (classroom_id, user_id, semester, day_of_week, block_start, block_end);
-- drop index if exists idx_room_ratings_classroom;
-- create index if not exists idx_room_ratings_block
--     on room_ratings (classroom_id, semester, day_of_week, block_start, block_end);

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
