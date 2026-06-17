-- Ratings + comments for non-classroom "places" (parking lots, library floors).
-- Keyed by a free-form text place_id like 'parking:g1' or 'library:4' so these
-- aren't tied to the classrooms table. Run in the Supabase SQL editor after
-- comments.sql (needs the profiles table + trigger). Safe to re-run.

-- ---------------------------------------------------------------------------
-- place_ratings — one thumbs vote per user per place (same semantics as
-- room_ratings: re-voting the same value clears it, the other flips it).
-- ---------------------------------------------------------------------------
create table if not exists place_ratings (
    id          uuid primary key default gen_random_uuid(),
    place_id    text not null,
    user_id     uuid not null references profiles (id) on delete cascade,
    is_positive boolean not null,
    created_at  timestamptz not null default now(),
    unique (place_id, user_id)
);

create index if not exists idx_place_ratings_place on place_ratings (place_id);

alter table place_ratings enable row level security;

drop policy if exists "public read" on place_ratings;
create policy "public read" on place_ratings
    for select to anon, authenticated using (true);
drop policy if exists "insert own" on place_ratings;
create policy "insert own" on place_ratings
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own" on place_ratings;
create policy "update own" on place_ratings
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own" on place_ratings;
create policy "delete own" on place_ratings
    for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- place_comments — mirrors `comments`, including the same spam guards, but
-- keyed by place_id. user_id references profiles so PostgREST can embed the
-- author in one query.
-- ---------------------------------------------------------------------------
create table if not exists place_comments (
    id         uuid primary key default gen_random_uuid(),
    place_id   text not null,
    user_id    uuid not null references profiles (id) on delete cascade,
    content    text not null check (char_length(btrim(content)) between 1 and 500),
    created_at timestamptz not null default now()
);

create index if not exists idx_place_comments_place
    on place_comments (place_id, created_at desc);
create index if not exists idx_place_comments_user_created
    on place_comments (user_id, created_at desc);

-- Spam guard: 30s cooldown, 20/day, no identical repost within 10 min.
create or replace function check_place_comment_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (
    select 1 from place_comments
    where user_id = new.user_id
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'You''re commenting too fast. Try again in a moment.';
  end if;

  if (
    select count(*) from place_comments
    where user_id = new.user_id
      and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Daily comment limit reached. Try again tomorrow.';
  end if;

  if exists (
    select 1 from place_comments
    where user_id = new.user_id
      and content = new.content
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Looks like a duplicate comment.';
  end if;

  return new;
end;
$$;

drop trigger if exists place_comments_rate_limit on place_comments;
create trigger place_comments_rate_limit
  before insert on place_comments
  for each row execute function check_place_comment_rate_limit();

alter table place_comments enable row level security;

drop policy if exists "public read" on place_comments;
create policy "public read" on place_comments
    for select to anon, authenticated using (true);
drop policy if exists "insert own" on place_comments;
create policy "insert own" on place_comments
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own" on place_comments;
create policy "delete own" on place_comments
    for delete to authenticated using (auth.uid() = user_id);

-- Trigger function only — never called directly, so drop the default
-- anon/authenticated EXECUTE grant (see the note in comments.sql).
revoke execute on function check_place_comment_rate_limit() from public, anon, authenticated;
