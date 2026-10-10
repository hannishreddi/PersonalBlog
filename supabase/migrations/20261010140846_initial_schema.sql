-- =============================================================================
-- Initial blog schema: posts, categories, tags, comments, reactions.
--
-- Security model (see README "Database" section):
--   * anon           -> may read published posts, their taxonomy, and approved
--                       comments. Nothing else. No writes.
--   * authenticated  -> same as anon, PLUS full management rights only if the
--                       user is the registered blog owner (private.blog_owner).
--                       Any other signed-in user is treated like anon.
--   * service_role   -> used only by server-side code (never shipped to the
--                       browser) to insert guest comments and reactions after
--                       validation and rate limiting. Triggers still force safe
--                       values on those inserts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Private schema: not exposed through the Data API. Holds the owner registry
-- and security-definer helpers so they cannot be called or read via PostgREST.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Single-row registry of the blog owner. The owner account is created in
-- Supabase Auth and then registered here manually (see README); there is no
-- self-service path into this table.
create table private.blog_owner (
  singleton  boolean primary key default true check (singleton),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.blog_owner enable row level security;
revoke all on private.blog_owner from public, anon, authenticated;

-- True only when the current request's JWT belongs to the registered owner.
create function private.is_blog_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.blog_owner
    where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_blog_owner() from public, anon;
grant execute on function private.is_blog_owner() to authenticated, service_role;

-- Generic updated_at maintenance.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique
             check (char_length(slug) between 1 and 80
                    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null
             check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tags
-- -----------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique
             check (char_length(slug) between 1 and 80
                    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null
             check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Posts
-- -----------------------------------------------------------------------------
create table public.posts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null
                     check (char_length(btrim(title)) between 1 and 200),
  slug               text not null unique
                     check (char_length(slug) between 1 and 120
                            and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt            text not null default ''
                     check (char_length(excerpt) <= 500),
  content_markdown   text not null default ''
                     check (char_length(content_markdown) <= 200000),
  -- Object path inside the post-images bucket, e.g. "covers/3f2c...e1.webp".
  -- Never a full URL; relative, no traversal, no leading slash.
  cover_image_path   text
                     check (cover_image_path is null or (
                       char_length(cover_image_path) <= 300
                       and cover_image_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'
                       and cover_image_path not like '%..%'
                       and cover_image_path not like '%//%')),
  cover_image_alt    text
                     check (cover_image_alt is null or char_length(cover_image_alt) <= 300),
  cover_image_width  integer check (cover_image_width is null or cover_image_width > 0),
  cover_image_height integer check (cover_image_height is null or cover_image_height > 0),
  category_id        uuid references public.categories (id) on delete set null,
  status             text not null default 'draft'
                     check (status in ('draft', 'published', 'archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,

  -- A published post must carry its publication time.
  constraint posts_published_requires_published_at
    check (status <> 'published' or published_at is not null),
  -- Cover metadata only makes sense alongside a cover path; alt is required
  -- (may be empty for purely decorative images) whenever a cover is set.
  constraint posts_cover_metadata_consistent
    check (
      (cover_image_path is null
        and cover_image_alt is null
        and cover_image_width is null
        and cover_image_height is null)
      or (cover_image_path is not null and cover_image_alt is not null)
    )
);

-- Public feed: newest published first. Also serves "adjacent post" lookups.
create index posts_published_feed_idx
  on public.posts (published_at desc, id)
  where status = 'published';
-- Category archives.
create index posts_category_published_idx
  on public.posts (category_id, published_at desc)
  where status = 'published';
-- Admin dashboard: filter by status, most recently edited first.
create index posts_status_updated_idx
  on public.posts (status, updated_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Post <-> tag join
-- -----------------------------------------------------------------------------
create table public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
-- Tag archives (the PK already covers lookups by post_id).
create index post_tags_tag_id_idx on public.post_tags (tag_id);

-- -----------------------------------------------------------------------------
-- Comments (guest, moderated, not threaded)
-- -----------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_name text not null
              check (char_length(btrim(author_name)) between 1 and 80),
  content     text not null
              check (char_length(btrim(content)) between 1 and 5000),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

-- Public: approved comments for one post, oldest first.
create index comments_post_approved_idx
  on public.comments (post_id, created_at)
  where status = 'approved';
-- Admin: moderation queue.
create index comments_status_created_idx
  on public.comments (status, created_at desc);

-- Every new comment starts pending with a server timestamp, regardless of
-- what the caller sent, and may only target a published post.
create function private.enforce_new_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.posts p
    where p.id = new.post_id and p.status = 'published'
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
revoke all on function private.enforce_new_comment() from public, anon, authenticated;

create trigger comments_enforce_new
  before insert on public.comments
  for each row execute function private.enforce_new_comment();

-- -----------------------------------------------------------------------------
-- Reactions
-- -----------------------------------------------------------------------------
-- reactor_hash is computed on the server as HMAC-SHA256(server secret,
-- random visitor id from an HttpOnly cookie), hex-encoded. It is never an IP
-- address or other raw identifier, and the browser never chooses it.
create table public.reactions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  reaction_type text not null default 'like'
                check (reaction_type in ('like')),
  reactor_hash  text not null
                check (reactor_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null default now(),

  -- One reaction of each type per visitor per post. Repeated submissions can
  -- use INSERT ... ON CONFLICT DO NOTHING. Also serves lookups by post_id.
  constraint reactions_one_per_visitor
    unique (post_id, reaction_type, reactor_hash)
);

create function private.enforce_new_reaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.posts p
    where p.id = new.post_id and p.status = 'published'
  ) then
    raise exception 'reactions can only be added to published posts'
      using errcode = 'check_violation';
  end if;

  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.enforce_new_reaction() from public, anon, authenticated;

create trigger reactions_enforce_new
  before insert on public.reactions
  for each row execute function private.enforce_new_reaction();

-- -----------------------------------------------------------------------------
-- Public engagement counts
-- -----------------------------------------------------------------------------
-- Readers cannot select reaction rows (they contain visitor hashes), so counts
-- are exposed through this function. It returns counts for published posts
-- only, computed from the authoritative rows. Unknown, draft, and archived
-- ids are indistinguishable: they simply produce no row.
--
-- Input is limited to 100 ids in total. cardinality() counts every element,
-- so multi-dimensional arrays cannot bypass the limit, and oversized input is
-- rejected rather than silently truncated.
create function public.get_post_engagement(post_ids uuid[])
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
      and p.id = any (post_ids);
end;
$$;
revoke all on function public.get_post_engagement(uuid[]) from public;
grant execute on function public.get_post_engagement(uuid[]) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Table privileges: start from nothing, grant only what each role needs.
-- RLS policies below further restrict which rows those privileges reach.
-- -----------------------------------------------------------------------------
revoke all on public.categories, public.tags, public.posts, public.post_tags,
              public.comments, public.reactions
  from public, anon, authenticated;

grant select on public.categories, public.tags, public.posts, public.post_tags,
                public.comments
  to anon;

grant select, insert, update, delete on public.categories, public.tags, public.posts
  to authenticated;
grant select, insert, delete on public.post_tags to authenticated;
-- The owner moderates comments: may read, change status only, or delete.
grant select, delete on public.comments to authenticated;
grant update (status) on public.comments to authenticated;
-- The owner may see and remove reactions (e.g. abuse cleanup); never insert.
grant select, delete on public.reactions to authenticated;

grant select, insert, update, delete on public.categories, public.tags, public.posts,
                                        public.post_tags, public.comments, public.reactions
  to service_role;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.tags       enable row level security;
alter table public.posts      enable row level security;
alter table public.post_tags  enable row level security;
alter table public.comments   enable row level security;
alter table public.reactions  enable row level security;

-- Categories & tags: readable by everyone; owner manages.
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories: owner insert" on public.categories
  for insert to authenticated with check ((select private.is_blog_owner()));
create policy "categories: owner update" on public.categories
  for update to authenticated
  using ((select private.is_blog_owner())) with check ((select private.is_blog_owner()));
create policy "categories: owner delete" on public.categories
  for delete to authenticated using ((select private.is_blog_owner()));

create policy "tags: public read" on public.tags
  for select to anon, authenticated using (true);
create policy "tags: owner insert" on public.tags
  for insert to authenticated with check ((select private.is_blog_owner()));
create policy "tags: owner update" on public.tags
  for update to authenticated
  using ((select private.is_blog_owner())) with check ((select private.is_blog_owner()));
create policy "tags: owner delete" on public.tags
  for delete to authenticated using ((select private.is_blog_owner()));

-- Posts: anon sees published only; owner sees and manages everything.
create policy "posts: anon read published" on public.posts
  for select to anon
  using (status = 'published' and published_at is not null);
create policy "posts: authenticated read published or owner" on public.posts
  for select to authenticated
  using ((status = 'published' and published_at is not null)
         or (select private.is_blog_owner()));
create policy "posts: owner insert" on public.posts
  for insert to authenticated with check ((select private.is_blog_owner()));
create policy "posts: owner update" on public.posts
  for update to authenticated
  using ((select private.is_blog_owner())) with check ((select private.is_blog_owner()));
create policy "posts: owner delete" on public.posts
  for delete to authenticated using ((select private.is_blog_owner()));

-- Post tags: visible only when the post itself is visible.
create policy "post_tags: anon read for published posts" on public.post_tags
  for select to anon
  using (post_id in (select p.id from public.posts p where p.status = 'published'));
create policy "post_tags: authenticated read published or owner" on public.post_tags
  for select to authenticated
  using ((select private.is_blog_owner())
         or post_id in (select p.id from public.posts p where p.status = 'published'));
create policy "post_tags: owner insert" on public.post_tags
  for insert to authenticated with check ((select private.is_blog_owner()));
create policy "post_tags: owner delete" on public.post_tags
  for delete to authenticated using ((select private.is_blog_owner()));

-- Comments: approved comments on published posts are public. No insert policy
-- for anon/authenticated: guest comments go through the server (service_role).
create policy "comments: anon read approved" on public.comments
  for select to anon
  using (status = 'approved'
         and post_id in (select p.id from public.posts p where p.status = 'published'));
create policy "comments: authenticated read approved or owner" on public.comments
  for select to authenticated
  using ((select private.is_blog_owner())
         or (status = 'approved'
             and post_id in (select p.id from public.posts p where p.status = 'published')));
create policy "comments: owner moderate" on public.comments
  for update to authenticated
  using ((select private.is_blog_owner())) with check ((select private.is_blog_owner()));
create policy "comments: owner delete" on public.comments
  for delete to authenticated using ((select private.is_blog_owner()));

-- Reactions: no public read or write. Owner may read and delete.
create policy "reactions: owner read" on public.reactions
  for select to authenticated using ((select private.is_blog_owner()));
create policy "reactions: owner delete" on public.reactions
  for delete to authenticated using ((select private.is_blog_owner()));
