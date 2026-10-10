# Personal blog

A standalone personal publication for essays, reflections, stories, and notes.
Project goals, stack decisions, and security requirements live in [`CLAUDE.md`](./CLAUDE.md).

## Current stage

| Area | Status |
| --- | --- |
| Public layout, homepage, article pages | Built, rendering **mock data only** |
| Database schema, RLS, storage bucket | **Applied** to Supabase project `exljazwsfaztsligtfwb` (see [Database](#database)) |
| App ↔ Supabase connection | Not started; no Supabase client or env vars in the app yet |
| Owner authentication and admin dashboard | Not started; no owner account registered |
| Guest comments and reactions | Schema ready; no submission endpoints, so readers cannot comment or react |
| Image upload and display | Private bucket ready; no upload flow or [image delivery](#image-delivery) yet |

The website does **not** read from the database yet. All posts, the publication
name ("The Quiet Margin"), the tagline, and the author label are placeholders. Edit
them in `src/config/site.ts` and `src/content/mock-posts.ts`.

## Commands

```bash
npm run dev        # start the dev server at http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # generate route types, then tsc --noEmit
npm run build      # production build
npm start          # serve the production build
```

No test runner is configured yet.

## Structure

```
src/
  app/                    routes (App Router)
    page.tsx              home feed: tiered 3 / 2 / 1-column grid
    page/[page]/page.tsx  older pages of the feed (/page/2, …)
    blog/[slug]/page.tsx  article page
    not-found.tsx, error.tsx
  components/
    layout/               site header and footer
    posts/                cards, feed, pagination, cover fallback art
    article/              Markdown article renderer
  config/site.ts          site name, tagline, page size (placeholders)
  content/mock-posts.ts   fictional placeholder posts (replaced by Supabase later)
  lib/                    data access, reading time, formatting
  types/post.ts           shared content types mirroring the planned schema
```

`src/lib/posts.ts` is the only module that reads post data. It filters to
`status = "published"` with a `publishedAt`, and sorts by publication time.
Pages never touch the raw data, so swapping in Supabase only changes this module.

## Database

Schema changes live in `supabase/migrations/` and are applied in filename order.
Both current migrations are applied to the Supabase project; their filenames match
the versions recorded in the project's migration history. Do not edit applied
migrations; add a new one instead.

| Migration | Creates |
| --- | --- |
| `20261010140846_initial_schema.sql` | `categories`, `tags`, `posts`, `post_tags`, `comments`, `reactions`; private owner registry; triggers; `get_post_engagement()` |
| `20261010140857_post_images_storage.sql` | Private `post-images` storage bucket and owner-only storage policies |

### Access model

RLS is enabled on every table. Table privileges start from nothing and are granted
per role.

- **Anonymous readers** (`anon`) can read published posts (status `published` with a
  `published_at`), categories, tags, tag links of published posts, and approved
  comments on published posts. They cannot write anything, read reactions, or access
  the image bucket.
- **The blog owner** is the single user listed in `private.blog_owner`. Signed in,
  they can manage posts and taxonomy, moderate comments (change `status` or delete;
  comment text cannot be edited), read and delete reactions, and manage files in
  `post-images`. Any other signed-in user is treated like an anonymous reader.
- **Server-only code** (`service_role`) will insert guest comments and reactions after
  validation and rate limiting. That key must never reach the browser.

Database rules that hold regardless of caller:

- New comments are forced to `pending` with a server timestamp, and only allowed on
  published posts. Reactions are only allowed on published posts and are unique per
  post, type, and visitor hash.
- Deleting a post deletes its comments, reactions, and tag links. Deleting a category
  leaves its posts uncategorised.
- `cover_image_path` must be a relative storage path, never a URL.

`public.get_post_engagement(uuid[])` returns reaction and approved-comment counts so
readers never need access to reaction rows. It runs as `SECURITY DEFINER` with an
empty `search_path`, returns rows only for published posts, and rejects null input or
more than 100 ids. Supabase's advisor flags it (lints 0028/0029) because `anon` and
`authenticated` can call it; that is intentional.

### Owner account (not set up yet)

There is no public sign-up path into the owner role. When owner authentication is
built, create the account in Supabase Auth, insert its user id into
`private.blog_owner` from the SQL editor, and disable public sign-ups.

### Image delivery

The `post-images` bucket is **private**: 5 MiB limit; JPEG, PNG, WebP, AVIF, and GIF
only (no SVG). Only the owner can list, read, upload, replace, or delete files, so
draft images are never publicly reachable.

**Planned, not built.** Published articles will display images like this:

1. A future migration adds a `post_images (post_id, storage_path)` reference table,
   filled on the server whenever the owner saves a post (cover plus images referenced
   in the Markdown).
2. One narrow storage `SELECT` policy lets `anon` read only objects referenced by a
   published post. Draft-only images never match.
3. A Next.js route handler (e.g. `/media/[...path]`) validates the path, fetches the
   object with the publishable key (so RLS decides), and streams it with cache
   headers. `next/image` uses it via `images.localPatterns`.

No privileged key is involved in serving images. Do not make the bucket public or add
a broad `anon` read policy to make images display.
