-- BeachRooms database schema
-- Run this in the Supabase SQL editor before running scrape_schedules.py.

-- ---------------------------------------------------------------------------
-- buildings
--   `code` is unique because the scraper upserts on it (on_conflict="code").
--   name / coordinates / address are filled in manually after scraping.
-- ---------------------------------------------------------------------------
create table if not exists buildings (
    id             uuid primary key default gen_random_uuid(),
    name           text,
    code           text not null unique,
    latitude       double precision,
    longitude      double precision,
    address        text,
    weekday_open   time,
    weekday_close  time,
    saturday_open  time,
    saturday_close time,
    sunday_open    time,
    sunday_close   time
);

-- ---------------------------------------------------------------------------
-- classrooms
--   (building_id, room_number) is unique because the scraper upserts on it.
--   is_alc marks Active Learning Classrooms (group study); the rooms are
--   populated by add_alc_rooms.sql.
-- ---------------------------------------------------------------------------
create table if not exists classrooms (
    id            uuid primary key default gen_random_uuid(),
    building_id   uuid not null references buildings(id) on delete cascade,
    room_number   text not null,
    capacity      integer,
    floor         integer,
    is_accessible boolean not null default false,
    is_alc        boolean not null default false,
    amenities     text[] not null default '{}',
    unique (building_id, room_number)
);

-- ---------------------------------------------------------------------------
-- class_schedules
--   One row per (section, weekday) — the scraper expands "MWF" into 3 rows.
--   day_of_week: 0=Sunday ... 6=Saturday (matches JS Date.getDay()).
--   created_at exists so the scraper's "delete all" step has a column to
--   filter on.
-- ---------------------------------------------------------------------------
create table if not exists class_schedules (
    id              uuid primary key default gen_random_uuid(),
    classroom_id    uuid not null references classrooms(id) on delete cascade,
    day_of_week     integer not null check (day_of_week between 0 and 6),
    start_time      time not null,
    end_time        time not null,
    semester        text not null,
    course_code     text,
    course_title    text,
    instructor_name text,
    created_at      timestamptz not null default now(),
    check (end_time > start_time)
);

create index if not exists idx_class_schedules_lookup
    on class_schedules (day_of_week, semester);
create index if not exists idx_class_schedules_classroom
    on class_schedules (classroom_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: public read-only, no public writes.
--   The app uses the anon key (read). The scraper uses the service-role key,
--   which bypasses RLS, so it can still write.
-- ---------------------------------------------------------------------------
alter table buildings       enable row level security;
alter table classrooms      enable row level security;
alter table class_schedules enable row level security;

create policy "public read" on buildings       for select to anon using (true);
create policy "public read" on classrooms      for select to anon using (true);
create policy "public read" on class_schedules for select to anon using (true);
