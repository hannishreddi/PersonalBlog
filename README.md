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
| Admin dashboard | Minimal `/admin` page: signed-in owner, post counts by status, sign out |
| Post editing and publishing | Not started. Posts can only be added through the Supabase dashboard for now |
| Guest comments and reactions | Schema ready; no submission endpoints, so readers cannot comment or react |
| Image upload and display | Private bucket ready; no upload flow or [image delivery](#image-delivery) yet, so every post shows the generated fallback cover |

The database currently has **no posts**, so the homepage shows its empty state.
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
    admin/                owner area: page.tsx (dashboard), login/, actions.ts (sign in/out)
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
    supabase/             env, public client, session client, proxy session refresh
    reading-time.ts, format.ts
  types/post.ts           content types used by components
  types/database.ts       generated Supabase types; regenerate after migrations
```

`src/lib/posts.ts` is the only module that reads public post data. It uses a
cookie-less client, so queries always run as `anon`: even when the owner is signed
in, drafts never reach public pages. It filters to published posts and orders by
`published_at desc, id desc`. Results are cached with `"use cache"` for a few minutes
and tagged `posts`; future admin mutations should call `updateTag("posts")`. Until
then, a post added or changed in the dashboard appears within a few minutes. The
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

## Database

Schema changes live in `supabase/migrations/` and are applied in filename order.
Both current migrations are applied to the Supabase project; their filenames match
the versions recorded in the project's migration history. Do not edit applied
migrations; add a new one instead.

| Migration | Creates |
| --- | --- |
| `20261010140846_initial_schema.sql` | `categories`, `tags`, `posts`, `post_tags`, `comments`, `reactions`; private owner registry; triggers; `get_post_engagement()` |
| `20261010140857_post_images_storage.sql` | Private `post-images` storage bucket and owner-only storage policies |
| `20261010143645_owner_check_and_scheduled_visibility.sql` | `public.is_blog_owner()` for the app's owner check; public reads also require `published_at <= now()` |

### Access model

RLS is enabled on every table. Table privileges start from nothing and are granted
per role.

- **Anonymous readers** (`anon`) can read published posts (status `published` with a
  `published_at` that is not in the future, so scheduled posts stay hidden), categories, tags, tag links of published posts, and approved
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

## Image delivery

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
