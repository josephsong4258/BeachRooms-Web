-- Upvotes for comments (rooms) and place_comments (parking, library).
-- Upvote-only by design: a row's existence is one upvote; removing the row
-- removes it. There is no downvote. Run in the Supabase SQL editor after
-- comments.sql + places.sql (needs the comments tables + profiles). Safe to
-- re-run.

-- ---------------------------------------------------------------------------
-- comment_votes — one upvote per user per room comment. comment_id cascades
-- from comments so a deleted comment takes its votes with it; user_id cascades
-- from profiles so deleting an account clears the user's votes.
-- ---------------------------------------------------------------------------
create table if not exists comment_votes (
    id         uuid primary key default gen_random_uuid(),
    comment_id uuid not null references comments (id) on delete cascade,
    user_id    uuid not null references profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (comment_id, user_id)
);

create index if not exists idx_comment_votes_comment on comment_votes (comment_id);

-- ---------------------------------------------------------------------------
-- place_comment_votes — same, keyed to place_comments.
-- ---------------------------------------------------------------------------
create table if not exists place_comment_votes (
    id               uuid primary key default gen_random_uuid(),
    place_comment_id uuid not null references place_comments (id) on delete cascade,
    user_id          uuid not null references profiles (id) on delete cascade,
    created_at       timestamptz not null default now(),
    unique (place_comment_id, user_id)
);

create index if not exists idx_place_comment_votes_comment
    on place_comment_votes (place_comment_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: counts are public; users manage only their own upvote.
-- No update policy — an upvote is insert-or-delete, never edited.
-- ---------------------------------------------------------------------------
alter table comment_votes enable row level security;
alter table place_comment_votes enable row level security;

drop policy if exists "public read" on comment_votes;
create policy "public read" on comment_votes
    for select to anon, authenticated using (true);
drop policy if exists "insert own" on comment_votes;
create policy "insert own" on comment_votes
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own" on comment_votes;
create policy "delete own" on comment_votes
    for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "public read" on place_comment_votes;
create policy "public read" on place_comment_votes
    for select to anon, authenticated using (true);
drop policy if exists "insert own" on place_comment_votes;
create policy "insert own" on place_comment_votes
    for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own" on place_comment_votes;
create policy "delete own" on place_comment_votes
    for delete to authenticated using (auth.uid() = user_id);
