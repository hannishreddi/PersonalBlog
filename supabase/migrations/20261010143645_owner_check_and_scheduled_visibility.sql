-- =============================================================================
-- Owner check for the app, and hide scheduled posts from public reads.
--
-- 1. public.is_blog_owner(): the private schema is not exposed through the
--    Data API, so the Next.js server could not ask whether the signed-in user
--    is the owner. This thin wrapper exposes only that boolean. It runs as the
--    caller (security invoker) and delegates to private.is_blog_owner(), which
--    compares the registry against auth.uid() from the verified JWT. It takes
--    no arguments, so callers cannot ask about any other user.
--
-- 2. Public read policies previously accepted any published post with a
--    published_at, including one dated in the future. Anyone holding the
--    publishable key could read such "scheduled" posts straight from the API.
--    Public visibility now also requires published_at <= now(). Owner access
--    is unchanged.
-- =============================================================================

create function public.is_blog_owner()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_blog_owner();
$$;
revoke all on function public.is_blog_owner() from public, anon;
grant execute on function public.is_blog_owner() to authenticated;

-- -----------------------------------------------------------------------------
-- Posts
-- -----------------------------------------------------------------------------
alter policy "posts: anon read published" on public.posts
  using (status = 'published'
         and published_at is not null
         and published_at <= now());

alter policy "posts: authenticated read published or owner" on public.posts
  using ((status = 'published'
          and published_at is not null
          and published_at <= now())
         or (select private.is_blog_owner()));

-- -----------------------------------------------------------------------------
-- Post tags
-- -----------------------------------------------------------------------------
alter policy "post_tags: anon read for published posts" on public.post_tags
  using (post_id in (
    select p.id from public.posts p
    where p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()));

alter policy "post_tags: authenticated read published or owner" on public.post_tags
  using ((select private.is_blog_owner())
         or post_id in (
           select p.id from public.posts p
           where p.status = 'published'
             and p.published_at is not null
             and p.published_at <= now()));

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------
alter policy "comments: anon read approved" on public.comments
  using (status = 'approved'
         and post_id in (
           select p.id from public.posts p
           where p.status = 'published'
             and p.published_at is not null
             and p.published_at <= now()));

alter policy "comments: authenticated read approved or owner" on public.comments
  using ((select private.is_blog_owner())
         or (status = 'approved'
             and post_id in (
               select p.id from public.posts p
               where p.status = 'published'
                 and p.published_at is not null
                 and p.published_at <= now())));

-- -----------------------------------------------------------------------------
-- Engagement counts: same visibility rule. Body otherwise unchanged;
-- create or replace keeps the existing grants.
-- -----------------------------------------------------------------------------
create or replace function public.get_post_engagement(post_ids uuid[])
returns table (post_id uuid, reaction_count bigint, approved_comment_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if post_ids is null or cardinality(post_ids) > 100 then
    raise exception 'post_ids must be an array of at most 100 ids'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
    select
      p.id,
      (select count(*) from public.reactions r where r.post_id = p.id),
      (select count(*) from public.comments c
        where c.post_id = p.id and c.status = 'approved')
    from public.posts p
    where p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
      and p.id = any (post_ids);
end;
$$;
