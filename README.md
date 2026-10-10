# Personal blog

A standalone personal publication for essays, reflections, stories, and notes.
Project goals, stack decisions, and security requirements live in [`CLAUDE.md`](./CLAUDE.md).

## Current stage

| Area | Status |
| --- | --- |
| Public layout, homepage, article pages | Built; **reads published posts from Supabase** (no mock data) |
| Database schema, RLS, storage bucket | **Applied** to Supabase project `exljazwsfaztsligtfwb` (see [Database](#database)) |
| App ↔ Supabase connection | Done: `@supabase/ssr` session client for admin, cookie-less anon client for public pages |
| Owner authentication | Login, logout, session refresh, server-side owner checks. The owner must be [registered](#owner-account) |
| Admin dashboard | `/admin`: post list filtered by status, with counts and pagination; sign out |
| Post editing and publishing | Markdown editor with live preview; create, edit, save drafts, publish, schedule, unpublish, archive, delete (see [Writing and publishing](#writing-and-publishing)) |
| Guest comments and reactions | Schema ready; no submission endpoints, so readers cannot comment or react |
| Image upload and display | Cover and inline image upload in the editor; published images served through `/media` (see [Images](#images)). Posts without a cover show generated artwork |

The database currently has **no posts**, so the homepage shows its empty state until
the first post is published from `/admin`.
The publication name ("The Quiet Margin"), tagline, homepage intro, and author label
are still placeholders; edit them in `src/config/site.ts` and `src/app/page.tsx`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase dashboard
   (**Project Settings → API Keys**, the `sb_publishable_…` key). Both are public values.
   The app needs no secret key yet; never put one in a `NEXT_PUBLIC_*` variable.
3. Register the owner account ([below](#owner-account)), then run `npm run dev` and
   sign in at `/admin/login`.

The production build reads Supabase to prerender pages, so the env vars must be set
wherever `npm run build` runs.

## Commands

```bash
npm run dev        # start the dev server at http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # generate route types, then tsc --noEmit
npm run build      # production build
npm start          # serve the production build
```

No test runner is configured yet; verification has been manual so far.

## Structure

```
src/
  proxy.ts                refreshes the auth session on /admin/* (optimistic redirect only)
  app/                    routes (App Router)
    page.tsx              home feed: tiered 3 / 2 / 1-column grid
    page/[page]/page.tsx  older pages of the feed (/page/2, …)
    blog/[slug]/page.tsx  article page
    admin/                owner area: page.tsx (dashboard + post list), login/, actions.ts (sign in/out)
      posts/              new/, [id]/ (editor pages), actions.ts (save/delete), post-editor.tsx,
                          cover-image-field.tsx, upload-image.ts (browser upload helper)
      images/             route.ts (POST upload), [...path]/route.ts (owner-only image preview)
    media/[...path]/      public image delivery for published posts
    not-found.tsx, error.tsx
  components/
    layout/               site header and footer
    posts/                cards, feed, pagination, cover fallback art
    article/              Markdown article renderer
  config/site.ts          site name, tagline, page size (placeholders)
  lib/
    posts.ts              public data access (cached, anon client)
    auth.ts               owner checks: getViewerStatus(), requireOwner()
    admin.ts              owner-only data access (each function calls requireOwner)
    slug.ts, post-limits.ts  slug rules and field limits shared by editor and actions
    images.ts             image path format, limits, /media URL helpers (client-safe)
    image-validation.ts   server-only: identifies uploads by their bytes, reads dimensions
    supabase/             env, public client, session client, proxy session refresh
    reading-time.ts, format.ts
  types/post.ts           content types used by components
  types/database.ts       generated Supabase types; regenerate after migrations
```

`src/lib/posts.ts` is the only module that reads public post data. It uses a
cookie-less client, so queries always run as `anon`: even when the owner is signed
in, drafts never reach public pages. It filters to published posts and orders by
`published_at desc, id desc`. Results are cached with `"use cache"` for a few minutes
and tagged `posts`; every successful post mutation calls `updateTag("posts")`, so
changes made in `/admin` appear on the next public request. Edits made directly in the
Supabase dashboard still take up to a few minutes. The
newest 50 articles are prerendered at build time; older ones render on first visit.

### Authentication

- `/admin/login` signs in with email and password through a Server Action. After the
  password check it calls `public.is_blog_owner()`; a valid account that isn't the
  owner is signed straight back out.
- `src/proxy.ts` runs only on `/admin/*`. It refreshes the session cookies and sends
  visitors without a valid session to the login page. That redirect is a
  convenience, not the security boundary.
- The real checks happen on the server: `/admin` calls `getViewerStatus()`, which
  verifies the JWT with `getClaims()` and asks the database whether that user is in
  `private.blog_owner`. Every future admin page, Server Action, and Route Handler
  must call `requireOwner()` first; RLS then enforces the same rule in the database.

## Writing and publishing

Sign in at `/admin/login`, then use **New post** on the dashboard, or a post's title in
the list, to open the editor.

- **Fields:** title, slug, excerpt, category, publication date, cover image, tags, and
  the Markdown body. Images are covered in [Images](#images). The slug follows the title until you edit it. A category or tag that doesn't
  exist yet is created on save; tags are comma-separated (at most 10).
- **Preview:** the Write / Preview toggle renders the article with the same
  `ArticleBody` component the public site uses. Raw HTML in Markdown is escaped and
  unsafe link schemes are dropped, as on the public site.
- **Actions** depend on the post's status:

  | Status | Buttons |
  | --- | --- |
  | Draft (or new) | Save draft, Publish / Schedule, Archive |
  | Published | Update (changes go live), Unpublish (back to draft), Archive |
  | Archived | Save, Restore as draft, Publish |

  Deleting is a separate two-step control at the bottom of the editor. It removes the
  post with its tag links, comments, and reactions (database cascade). Unpublish or
  archive to hide a post without losing it.
- **Publication date:** entered in your browser's time zone and stored in UTC. Leave it
  empty to use the moment you publish. A future date makes the post **scheduled**: it
  is `published` in the database, but RLS hides it from readers until that time, and it
  appears publicly within one cache lifetime (about a minute) after that.
  Unpublishing or archiving keeps the date, so republishing restores the original date
  unless you change it.
- **Validation:** every field is checked on the server with Zod, using the same limits
  as the database constraints. Publishing also requires an excerpt and a body. Slugs
  must be unique across all posts, whatever their status; a duplicate is reported on
  the slug field.
- **Stale edits:** each save only applies if the post hasn't changed since the editor
  loaded it (compared by `updated_at`). Saving from a second tab after the first one
  saved shows an error instead of overwriting.
- **Unsaved changes:** the editor shows "Unsaved changes" and the browser warns before
  you leave the page.

Security: `savePost` and `deletePost` in `src/app/admin/posts/actions.ts` each call
`requireOwner()` before reading any input, then write with the owner's session, so RLS
checks ownership again. Status and timestamps are derived on the server from a fixed
set of intents (`save`, `publish`, `unpublish`, `archive`); the browser can't set them
directly.

## Database

Schema changes live in `supabase/migrations/` and are applied in filename order.
All current migrations are applied to the Supabase project; their filenames match
the versions recorded in the project's migration history. Do not edit applied
migrations; add a new one instead.

| Migration | Creates |
| --- | --- |
| `20261010140846_initial_schema.sql` | `categories`, `tags`, `posts`, `post_tags`, `comments`, `reactions`; private owner registry; triggers; `get_post_engagement()` |
| `20261010140857_post_images_storage.sql` | Private `post-images` storage bucket and owner-only storage policies |
| `20261010143645_owner_check_and_scheduled_visibility.sql` | `public.is_blog_owner()` for the app's owner check; public reads also require `published_at <= now()` |
| `20261010154237_post_image_references.sql` | `post_images` reference table kept in sync by a trigger; one storage read policy for images of visible published posts |

### Access model

RLS is enabled on every table. Table privileges start from nothing and are granted
per role.

- **Anonymous readers** (`anon`) can read published posts (status `published` with a
  `published_at` that is not in the future, so scheduled posts stay hidden), categories, tags, tag links of published posts, and approved
  comments on published posts. They cannot write anything or read reactions. In the
  image bucket they can read only objects referenced by a visible published post (see
  [Images](#images)); they cannot list, upload, or read anything else.
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
- `post_images` is derived data: the `posts_sync_images` trigger rewrites a post's rows
  whenever its cover or Markdown changes. No API role can write to it.

`public.is_blog_owner()` returns whether the caller's verified JWT belongs to the
registered owner. It takes no arguments, runs as the caller, and only `authenticated`
may execute it.

`public.get_post_engagement(uuid[])` returns reaction and approved-comment counts so
readers never need access to reaction rows. It runs as `SECURITY DEFINER` with an
empty `search_path`, returns rows only for published posts, and rejects null input or
more than 100 ids. Supabase's advisor flags it (lints 0028/0029) because `anon` and
`authenticated` can call it; that is intentional.

### Owner account

There is no sign-up path in the app, and public sign-ups are disabled in Supabase
Auth. To register the owner (one time):

1. In the Supabase dashboard, open **Authentication → Users** and confirm the owner
   account exists and has a password. To set one, send a password recovery email from
   the user's menu.
2. In the **SQL Editor**, run this, replacing the email:

   ```sql
   insert into private.blog_owner (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```

   The table holds exactly one row. To change owners, delete the existing row first.
3. Sign in at `/admin/login`.

Recommended: turn on **leaked password protection** in Supabase Auth's password
settings. The Supabase security advisor currently reports it as off.

### Known limitations

- The first request for an unknown article slug or page number streams the
  not-found page with HTTP 200 and a `noindex` tag (Next.js streaming with Partial
  Prefetching). Repeat requests return 404.
- Category and tag archive routes (`/category/[slug]`, `/tag/[slug]`) are not built.
  Categories appear on cards and articles, tags on articles only.
- The comment and reaction insert triggers check `status = 'published'` but not
  `published_at <= now()`. Tighten them when those endpoints are built.
- Saving a post is several PostgREST requests, not one transaction: categories and tags
  are created first, then the post row is written, then tag links are synced (adding
  before removing). If the last step fails, the post is saved and the editor reports
  that its tags weren't updated; saving again fixes it. A database function could make
  this atomic, which would need a migration.
- Categories and tags are never deleted automatically, even when no post uses them.
  There is no screen to rename or delete them yet; use the Supabase dashboard.
- There is no automated test suite. Owner-side editor workflows have to be tested
  manually in the browser.
- Uploaded images that were never saved into a post (for example, the editor tab was
  closed before saving) stay in the bucket as private orphans. Nothing serves them.
  Remove them from the Supabase dashboard if needed.
- Article pages don't yet add the cover as an Open Graph image; that needs an absolute
  site URL (`metadataBase`), planned with the SEO stage.

## Images

### Writing with images

- **Cover:** in the editor, **Upload cover** (or drop a file on the cover box). Then
  **Replace cover** or **Remove cover**. Add a description (alt text); leave it empty
  only for purely decorative images. The cover shows at 16:9 on the article and is
  cropped to each card tier's ratio on the homepage.
- **Inline images:** **Insert image** above the article text, or paste or drop image
  files into the text. A placeholder holds the image's place while it uploads (you can
  keep typing), then becomes `![](/media/inline/…)` with the cursor between the square
  brackets so you can type the description. The editor counts images without a
  description.
- Saving is disabled while uploads are in progress. Upload progress and errors are
  shown next to each control.
- **Preview** shows cover and inline images, including those of drafts, through the
  owner-only route.

Accepted: JPEG, PNG, WebP, AVIF, GIF up to 5 MiB and 10,000 px per side. SVG is
rejected.

### Image delivery

| Piece | Role |
| --- | --- |
| `post-images` bucket | **Private.** Storage enforces the 5 MiB and MIME limits. Owner policies allow list, read, upload, replace, delete |
| `POST /admin/images` | Owner-only upload. Checks the request origin, then `getViewerStatus()` (401/403), then the file: size, extension, and the **actual bytes** (magic numbers and header parsing decide the type; the browser's type and name must agree with it). Stores as `covers/` or `inline/<uuid>-<w>x<h>.<ext>` with `upsert: false`, using the owner's session |
| `public.post_images` | Which object paths each post references (cover plus `/media/…` in the Markdown). Maintained by a database trigger, so it always matches the saved post |
| Storage policy `post-images: read images of published posts` | `anon`/`authenticated` may read an object only if a post that is `published` with `published_at <= now()` references it |
| `GET /media/<path>` | Public delivery. Validates the path format, downloads with the **cookie-less publishable-key client** (RLS decides), returns 404 for anything not allowed. `Cache-Control: public, max-age=300`, `nosniff`, content type from the validated extension |
| `GET /admin/images/<path>` | Owner-only preview of any image (drafts included). `private, no-store`, rendered with a plain `<img>` so it never enters the shared optimizer cache |
| `next/image` | `images.localPatterns` allows only `/media/**` without a query string. `minimumCacheTTL` is 300 s |

Draft, archived, scheduled-only, and unreferenced images are therefore never readable
by readers, either through `/media` or directly from the Storage API with the
publishable key. No privileged key is used anywhere. Do not make the bucket public or
add a broader `anon` read policy.

**Dimensions** are part of the object name, so pages reserve the right space without a
lookup. They come from the file header; for JPEGs with EXIF rotation, the browser's
displayed size is accepted only if it is exactly the header size swapped.

**Cleanup:** after a successful save, images the post stopped using (a replaced or
removed cover, inline images deleted from the text, uploads from this editor session
that were never used) are deleted from storage, but **only if no post of any status
still references them**. Deleting a post does the same for its images. A failed save
deletes nothing. If the cleanup itself fails, files are left behind; nothing breaks.

**Caching after unpublishing:** `/media` responses and optimized images are cached for
up to about 5 minutes. Someone who already has an image URL may still load it for that
long after its post is unpublished. Object names are random and never reused, so a
cached copy can never show a different image.
