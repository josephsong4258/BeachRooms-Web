-- Per-user favorite rooms and buildings
-- Run this in the Supabase SQL editor (after comments.sql — needs profiles).

-- ---------------------------------------------------------------------------
-- favorites
--   One row per favorite; exactly one of classroom_id / building_id / place_id
--   is set. classrooms and buildings are upserted (never deleted) by the
--   scraper, so the FKs are stable across scrape runs. place_id is a free-form
--   text key (like place_ratings/place_comments, e.g. 'library') for special
--   places that have no row in the buildings table.
-- ---------------------------------------------------------------------------
create table if not exists favorites (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references profiles (id) on delete cascade,
    classroom_id uuid references classrooms (id) on delete cascade,
    building_id  uuid references buildings (id) on delete cascade,
    place_id     text,
    created_at   timestamptz not null default now(),
    constraint favorites_one_target check (num_nonnulls(classroom_id, building_id, place_id) = 1)
);

-- Backfill for tables created before place_id existed: add the column, then
-- swap the two-way "one target" check for the three-way version. Idempotent.
alter table favorites add column if not exists place_id text;
alter table favorites drop constraint if exists favorites_check;
alter table favorites drop constraint if exists favorites_one_target;
alter table favorites add constraint favorites_one_target
    check (num_nonnulls(classroom_id, building_id, place_id) = 1);

-- Partial unique indexes stand in for a composite unique constraint, which
-- can't span two nullable columns.
create unique index if not exists idx_favorites_user_room
    on favorites (user_id, classroom_id) where classroom_id is not null;
create unique index if not exists idx_favorites_user_building
    on favorites (user_id, building_id) where building_id is not null;
create unique index if not exists idx_favorites_user_place
    on favorites (user_id, place_id) where place_id is not null;

-- ---------------------------------------------------------------------------
-- Row Level Security: favorites are private — each user sees and manages
-- only their own.
-- ---------------------------------------------------------------------------
alter table favorites enable row level security;

drop policy if exists "read own" on favorites;
create policy "read own" on favorites
    for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert own" on favorites;
create policy "insert own" on favorites
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own" on favorites;
create policy "delete own" on favorites
    for delete to authenticated using (auth.uid() = user_id);
