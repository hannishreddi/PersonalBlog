-- =============================================================================
-- Image references for published-image delivery (README "Image delivery").
--
-- post_images records which storage objects each post references: its cover
-- plus every /media/<path> reference in its Markdown. It is DERIVED data,
-- maintained only by a trigger on posts, so it is always consistent with the
-- post row in the same transaction. No API role can write to it.
--
-- One narrow storage SELECT policy then lets readers fetch an object only if
-- a currently visible published post references it. Draft-only, archived-only,
-- scheduled-only, and unreferenced images never match.
-- =============================================================================

-- Canonical object path format produced by the upload flow:
--   covers/<uuid>-<width>x<height>.<ext>   or   inline/<uuid>-<width>x<height>.<ext>
-- The same pattern is enforced in the app (src/lib/images.ts).
create table public.post_images (
  post_id      uuid not null references public.posts (id) on delete cascade,
  storage_path text not null
               check (char_length(storage_path) <= 300
                      and storage_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$'
                      and storage_path not like '%..%'
                      and storage_path not like '%//%'),
  primary key (post_id, storage_path)
);
-- Storage policy lookups go by path.
create index post_images_storage_path_idx on public.post_images (storage_path);

alter table public.post_images enable row level security;

revoke all on public.post_images from public, anon, authenticated;
-- Read-only for API roles; RLS below limits rows. Writes happen only in the
-- trigger function (security definer).
grant select on public.post_images to anon, authenticated;
grant select, insert, update, delete on public.post_images to service_role;

create policy "post_images: anon read for published posts" on public.post_images
  for select to anon
  using (post_id in (
    select p.id from public.posts p
    where p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()));

create policy "post_images: authenticated read published or owner" on public.post_images
  for select to authenticated
  using ((select private.is_blog_owner())
         or post_id in (
           select p.id from public.posts p
           where p.status = 'published'
             and p.published_at is not null
             and p.published_at <= now()));

-- -----------------------------------------------------------------------------
-- Keep post_images in sync with each post's cover and Markdown.
-- -----------------------------------------------------------------------------
-- The storage paths a post references: its cover plus every /media/<path> in
-- the Markdown that matches the canonical upload format.
create function private.post_image_refs(cover_path text, markdown text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct path), '{}')
  from (
    select cover_path as path
    where cover_path is not null
    union
    select m[1]
    from regexp_matches(
      markdown,
      '/media/((?:covers|inline)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[1-9][0-9]{0,4}x[1-9][0-9]{0,4}\.(?:jpg|png|webp|avif|gif))',
      'g') as m
  ) refs;
$$;
revoke all on function private.post_image_refs(text, text) from public, anon, authenticated;

create function private.sync_post_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text[] := private.post_image_refs(new.cover_image_path, new.content_markdown);
begin
  delete from public.post_images
   where post_id = new.id
     and storage_path <> all (wanted);

  insert into public.post_images (post_id, storage_path)
  select new.id, path from unnest(wanted) as path
  on conflict do nothing;

  return null;
end;
$$;
revoke all on function private.sync_post_images() from public, anon, authenticated;

create trigger posts_sync_images
  after insert or update of content_markdown, cover_image_path on public.posts
  for each row execute function private.sync_post_images();

-- Backfill existing posts. A direct insert, so updated_at is left untouched.
insert into public.post_images (post_id, storage_path)
select p.id, path
from public.posts p
cross join lateral unnest(private.post_image_refs(p.cover_image_path, p.content_markdown)) as path
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Storage: readers may read only objects referenced by a visible published
-- post. The subquery runs with the caller's privileges, so post_images RLS
-- (published only for non-owners) applies on top of the explicit filters.
-- -----------------------------------------------------------------------------
create policy "post-images: read images of published posts" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'post-images'
    and exists (
      select 1
      from public.post_images pi
      join public.posts p on p.id = pi.post_id
      where pi.storage_path = objects.name
        and p.status = 'published'
        and p.published_at is not null
        and p.published_at <= now()
    )
  );
