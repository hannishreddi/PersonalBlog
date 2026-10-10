-- =============================================================================
-- Storage bucket for cover and inline post images.
--
-- * Private bucket: nothing is served from the public CDN endpoint, and no
--   policy grants anon (or non-owner users) any access, so readers cannot
--   list, download, or mint signed URLs for objects directly. Draft images
--   therefore stay private.
-- * Only the registered blog owner may read, upload, replace, or delete
--   objects through the Storage API.
-- * Published article images will be delivered later through a dedicated,
--   server-side mechanism that only serves images referenced by published
--   posts (see README "Image delivery"). Do not add a broad anon SELECT
--   policy to this bucket to make images display.
-- * Size and MIME limits are enforced by Storage itself, in addition to the
--   server-side validation the upload flow will perform. SVG is excluded
--   because it can carry script.
-- * No ON CONFLICT clause: if a bucket with this id already exists (possibly
--   with different, e.g. public, settings) the migration fails loudly rather
--   than silently keeping those settings.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  false,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
);

create policy "post-images: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-images' and (select private.is_blog_owner()));

create policy "post-images: owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (select private.is_blog_owner()));

create policy "post-images: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-images' and (select private.is_blog_owner()))
  with check (bucket_id = 'post-images' and (select private.is_blog_owner()));

create policy "post-images: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and (select private.is_blog_owner()));
