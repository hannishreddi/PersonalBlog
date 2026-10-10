-- =============================================================================
-- Reader engagement: guest comments and reactions (README "Reader engagement").
--
-- 1. The comment and reaction insert triggers now also require
--    published_at <= now(), so scheduled posts cannot receive either.
-- 2. private.rate_limits + private.hit_rate_limit(): fixed-window counters
--    stored in the database, so limits hold across server instances. Subjects
--    are HMAC digests computed by the app; no IP address or raw identifier is
--    stored. Rows older than two days are pruned opportunistically.
-- 3. Three functions the Next.js server calls with the secret (service_role)
--    key after validating input. Each runs its visibility check, rate limits,
--    and write in a single transaction. anon and authenticated cannot execute
--    them, so the publishable key cannot bypass the server's checks, and
--    nobody but the server ever supplies a visitor hash.
--
-- No existing table, column, constraint, or policy changes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Insert triggers: only posts that are public right now.
-- -----------------------------------------------------------------------------
create or replace function private.enforce_new_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.posts p
    where p.id = new.post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  ) then
    raise exception 'comments can only be added to published posts'
      using errcode = 'check_violation';
  end if;

  new.status := 'pending';
  new.created_at := now();
  new.author_name := btrim(new.author_name);
  new.content := btrim(new.content);
  return new;
end;
$$;

create or replace function private.enforce_new_reaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.posts p
    where p.id = new.post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  ) then
    raise exception 'reactions can only be added to published posts'
      using errcode = 'check_violation';
  end if;

  new.created_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Rate limiting
-- -----------------------------------------------------------------------------
create table private.rate_limits (
  bucket       text not null check (char_length(bucket) between 1 and 40),
  -- An HMAC hex digest from the app, or a post id for per-post limits.
  subject      text not null check (char_length(subject) between 1 and 64),
  window_start timestamptz not null,
  hits         integer not null check (hits > 0),
  primary key (bucket, subject, window_start)
);
create index rate_limits_window_start_idx on private.rate_limits (window_start);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated, service_role;

-- Counts one hit and returns true while the subject is within p_max hits for
-- the current window. The upsert is atomic, so concurrent requests cannot
-- both slip under the limit. Hits beyond the limit are still counted.
create function private.hit_rate_limit(p_bucket text, p_subject text, p_max integer, p_window interval)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  window_seconds double precision := extract(epoch from p_window);
  current_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  total integer;
begin
  insert into private.rate_limits as r (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, current_window, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning r.hits into total;

  -- Opportunistic cleanup keeps the table small without a scheduled job.
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return total <= p_max;
end;
$$;
revoke all on function private.hit_rate_limit(text, text, integer, interval)
  from public, anon, authenticated;
grant execute on function private.hit_rate_limit(text, text, integer, interval) to service_role;

-- True when readers can currently see the post.
create function private.is_post_public(p_post_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  );
$$;
revoke all on function private.is_post_public(uuid) from public, anon, authenticated;
grant execute on function private.is_post_public(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3. Server-only engagement functions (service_role only)
-- -----------------------------------------------------------------------------

-- Inserts a pending guest comment. p_client is HMAC(server secret, client IP),
-- used only for rate limiting and never stored with the comment.
-- Returns 'ok', 'unavailable' (post not public), or 'rate_limited'.
create function public.submit_guest_comment(
  p_post_id uuid,
  p_author_name text,
  p_content text,
  p_client text
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_client is null or p_client !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid client digest' using errcode = 'invalid_parameter_value';
  end if;

  if not private.is_post_public(p_post_id) then
    return 'unavailable';
  end if;

  -- Per client: 3 per 10 minutes and 10 per day. Per post: 30 per hour.
  -- Site-wide: at most 500 comments waiting for moderation.
  if not private.hit_rate_limit('comment:burst', p_client, 3, interval '10 minutes')
     or not private.hit_rate_limit('comment:daily', p_client, 10, interval '1 day')
     or not private.hit_rate_limit('comment:post', p_post_id::text, 30, interval '1 hour')
     or (select count(*) from public.comments where status = 'pending') >= 500
  then
    return 'rate_limited';
  end if;

  -- The insert trigger forces status 'pending' and a server timestamp.
  insert into public.comments (post_id, author_name, content)
  values (p_post_id, p_author_name, p_content);

  return 'ok';
end;
$$;

-- Adds (p_reacted = true) or removes a visitor's 'like' and returns the
-- resulting state. p_reactor is HMAC(server secret, visitor cookie id) and is
-- what reactions.reactor_hash stores; p_client is HMAC(server secret, IP),
-- used only for rate limiting.
-- outcome: 'ok', 'unavailable' (post not public; zero counts), or
-- 'rate_limited' (nothing changed; current state returned).
create function public.set_post_reaction(
  p_post_id uuid,
  p_reactor text,
  p_client text,
  p_reacted boolean
)
returns table (outcome text, reacted boolean, reaction_count bigint)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  result text := 'ok';
  already boolean;
begin
  if p_reactor is null or p_reactor !~ '^[0-9a-f]{64}$'
     or p_client is null or p_client !~ '^[0-9a-f]{64}$'
     or p_reacted is null then
    raise exception 'invalid reaction input' using errcode = 'invalid_parameter_value';
  end if;

  if not private.is_post_public(p_post_id) then
    return query select 'unavailable'::text, false, 0::bigint;
    return;
  end if;

  select exists (
    select 1 from public.reactions r
    where r.post_id = p_post_id and r.reaction_type = 'like' and r.reactor_hash = p_reactor
  ) into already;

  -- Per visitor: 20 changes per 10 minutes. Per client IP: 120 changes per
  -- hour and 50 new likes per day (limits likes from repeatedly cleared cookies).
  if not private.hit_rate_limit('reaction:visitor', p_reactor, 20, interval '10 minutes')
     or not private.hit_rate_limit('reaction:client', p_client, 120, interval '1 hour')
     or (p_reacted and not already
         and not private.hit_rate_limit('reaction:new', p_client, 50, interval '1 day'))
  then
    result := 'rate_limited';
  elsif p_reacted and not already then
    insert into public.reactions (post_id, reaction_type, reactor_hash)
    values (p_post_id, 'like', p_reactor)
    on conflict (post_id, reaction_type, reactor_hash) do nothing;
  elsif not p_reacted and already then
    delete from public.reactions r
    where r.post_id = p_post_id and r.reaction_type = 'like' and r.reactor_hash = p_reactor;
  end if;

  return query
    select
      result,
      exists (
        select 1 from public.reactions r
        where r.post_id = p_post_id and r.reaction_type = 'like' and r.reactor_hash = p_reactor),
      (select count(*) from public.reactions r where r.post_id = p_post_id);
end;
$$;

-- Like count for a public post and whether this visitor has liked it.
-- p_reactor may be null (visitor without a cookie). No row for posts that
-- are not public.
create function public.get_post_reaction_state(p_post_id uuid, p_reactor text)
returns table (reacted boolean, reaction_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p_reactor is not null and exists (
      select 1 from public.reactions r
      where r.post_id = p_post_id and r.reaction_type = 'like' and r.reactor_hash = p_reactor),
    (select count(*) from public.reactions r where r.post_id = p_post_id)
  where private.is_post_public(p_post_id);
$$;

-- Supabase's default privileges grant EXECUTE on new public functions to
-- anon and authenticated; take that back explicitly.
revoke all on function public.submit_guest_comment(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.set_post_reaction(uuid, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.get_post_reaction_state(uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_comment(uuid, text, text, text) to service_role;
grant execute on function public.set_post_reaction(uuid, text, text, boolean) to service_role;
grant execute on function public.get_post_reaction_state(uuid, text) to service_role;
