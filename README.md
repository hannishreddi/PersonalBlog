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
| Guest comments and reactions | Likes and moderated guest comments on published articles; moderation at `/admin/comments` (see [Reader engagement](#reader-engagement)). Needs the two server-only secrets below |
| Image upload and display | Cover and inline image upload in the editor; published images served through `/media` (see [Images](#images)). Posts without a cover show generated artwork |
| Content discovery | Category and tag archives with pagination, clickable categories and tags, related articles under each post (see [Content discovery](#content-discovery)) |
| Design system | Peach/orange palette, Fraunces + Bricolage Grotesque + Caveat, light/dark theme toggle (see [Design](#design)) |
| Reader features | Search, Topics page, About page, RSS feed, sitemap and robots, table of contents, reading progress bar, share/copy-link (see [Reader features](#reader-features)) |

The site is "Hannish Reddi", written by A Hannish Reddi, and will be served at
`https://hannishreddi.in`. Name, tagline, and author live in `src/config/site.ts`;
the About page (`src/app/about/page.tsx`) holds the author's own details and contacts.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the
     Supabase dashboard (**Project Settings → API Keys**, the `sb_publishable_…` key).
     Both are public values.
   - `SUPABASE_SECRET_KEY`: the `sb_secret_…` key from the same page. **Server-only**;
     it is used solely to call the reader-engagement database functions.
   - `ENGAGEMENT_HASH_SECRET`: at least 32 random characters (command in
     `.env.example`). **Server-only.**
   - `SITE_URL`: the public origin, `https://hannishreddi.in` in production. Used as
     `metadataBase` for canonical URLs on articles and archives. When unset, pages
     omit canonical links instead of guessing a host. Set it in production builds:
     the sitemap is empty, the RSS autodiscovery link and the X/Bluesky/LinkedIn/email
     share links are hidden, and the feed falls back to the request's own origin
     until it is set.

   Never put a secret in a `NEXT_PUBLIC_*` variable. Without the two secrets the site
   still works, but the like button is hidden and the comment form says comments are
   closed.
3. Register the owner account ([below](#owner-account)), then run `npm run dev` and
   sign in at `/admin/login`.

The production build reads Supabase to prerender pages, so the env vars must be set
wherever `npm run build` runs. Whether the comment form is shown is decided when an
article is prerendered, so rebuild after adding the secrets.

## Commands

```bash
npm run dev        # start the dev server at http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # generate route types, then tsc --noEmit
npm run build      # production build
npm start          # serve the production build
```

No test runner is configured yet. Verification so far: manual browser testing of
earlier stages, plus for reader engagement (October 2026) a rolled-back SQL test of
the database functions and RLS, and an HTTP test script that called the real Server
Actions of a production build (`next start`). Test data was deleted afterwards.
Neither suite is checked in.

## Structure

```
src/
  proxy.ts                refreshes the auth session on /admin/* (optimistic redirect only)
  app/                    routes (App Router)
    page.tsx              home feed: tiered 3 / 2 / 1-column grid
    page/[page]/page.tsx  older pages of the feed (/page/2, …)
    category/[slug]/      category archive (page.tsx, page/[page]/, not-found.tsx)
    tag/[slug]/           tag archive, same structure
    blog/[slug]/page.tsx  article page; actions.ts (reader likes and comments)
    admin/                owner area: page.tsx (dashboard + post list), login/, actions.ts (sign in/out)
      comments/           moderation queue: page.tsx, actions.ts, moderation-controls.tsx
      posts/              new/, [id]/ (editor pages), actions.ts (save/delete), post-editor.tsx,
                          cover-image-field.tsx, upload-image.ts (browser upload helper)
      images/             route.ts (POST upload), [...path]/route.ts (owner-only image preview)
    media/[...path]/      public image delivery for published posts
    not-found.tsx, error.tsx
  components/
    layout/               site header and footer
    posts/                cards, feed, pagination, cover fallback art, archive view and not-found
    article/              Markdown article renderer
    engagement/           like button, comment list and form under articles
  config/site.ts          site name, tagline, page size (placeholders)
  lib/
    posts.ts              public data access (cached, anon client)
    auth.ts               owner checks: getViewerStatus(), requireOwner()
    admin.ts              owner-only data access (each function calls requireOwner)
    slug.ts, post-limits.ts  slug rules and field limits shared by editor and actions
    images.ts             image path format, limits, /media URL helpers (client-safe)
    image-validation.ts   server-only: identifies uploads by their bytes, reads dimensions
    engagement.ts         approved comments (cached), per-visitor like state
    visitor.ts            server-only: visitor cookie and HMAC digests
    comment-limits.ts     comment length/link limits shared by form and action
    supabase/             env, public client, session client, service client
                          (secret key, engagement RPCs only), proxy session refresh
    archives.ts           archive paths, page-number parsing, archive metadata
    site-url.ts           optional SITE_URL and canonical helper
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
- **Forgotten password:** run `npm run reset-password` in an interactive terminal
  from the project folder. It asks for the owner's email and a new password (typed
  hidden, at least 12 characters) and sets it with the Admin API, using
  `SUPABASE_SECRET_KEY` from `.env.local`. There is no public reset page.

## Writing and publishing

Sign in at `/admin/login`, then use **New post** on the dashboard, or a post's title in
the list, to open the editor.

- **Fields:** title, slug, excerpt, category, publication date, cover image, tags, and
  the Markdown body. Images are covered in [Images](#images). The slug follows the title until you edit it. A category or tag that doesn't
  exist yet is created on save; tags are comma-separated or written as `#hashtags` (at
  most 10). An all-lowercase category name is capitalised on save ("politics" → "Politics").
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
| `20261010211200_reader_engagement.sql` | Comment/reaction insert triggers also require `published_at <= now()`; `private.rate_limits` and `private.hit_rate_limit()`; service-role-only `submit_guest_comment`, `set_post_reaction`, `get_post_reaction_state` |

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
- **Server-only code** (`service_role`, via `SUPABASE_SECRET_KEY`) submits guest
  comments and reactions, and only through three database functions that `anon` and
  `authenticated` cannot execute. That key must never reach the browser.

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
- The same first-request behaviour applies to unknown or empty category and tag
  archives and out-of-range archive pages.
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

## Content discovery

### Routes

| Route | Shows |
| --- | --- |
| `/category/<slug>` | Published posts in that category, newest first, 9 per page |
| `/tag/<slug>` | Published posts with that tag, newest first, 9 per page |
| `/category/<slug>/page/<n>`, `/tag/<slug>/page/<n>` | Later pages; `/page/1` redirects to the archive itself |

Each archive shows a "Category" or "Tag" label, the term's name as the heading
(screen readers hear "Category: Essays" / "Tagged “reflection”"), the number of
published articles, compact cards, and newer/older pagination. A link back to all
writing sits above the heading.

Categories link to their archive from cards (homepage, feed pages, archives, related
articles) and from the article header. Tags link from the list under each article;
cards don't show tags. The category link on a card sits above the card's stretched
title link, and only the title link draws the card-wide focus outline.

### Not found and empty archives

Unknown slugs, malformed slugs, out-of-range or malformed page numbers, and categories
or tags with **no published posts** all show the same "Nothing to read here yet" page
(HTTP 404, `noindex`) with a link back to the feed. Categories and tags are created
from the editor before a post is published, and their rows are publicly readable, so
showing an empty archive would reveal the name of a term used only by drafts or
scheduled posts. Treating it as not found avoids that.

### Related articles

Under each article, up to three published posts that share its category or any of its
tags, ranked by how much they share (the category counts once, each shared tag once),
then newest first. The article itself is excluded. The section is omitted when nothing
is related; it is never padded with unrelated posts. The newer/older links can point at
the same posts.

### Data and caching

All discovery queries live in `src/lib/posts.ts` (`getArchivePage`, `getArchiveSlugs`,
`getRelatedPosts`) and use the cookie-less anon client, so RLS limits them to posts that
are published with `published_at <= now()`; drafts, archived, and scheduled posts never
reach archives, related lists, counts, or metadata. Tag archives filter with a second,
inner-joined `post_tags` embedding so each card still receives all of its tags. Results
are cached like the rest of the module (`"use cache"`, tag `posts`, a few minutes); post
saves already call `updateTag("posts")`. Renaming a category or tag in the Supabase
dashboard shows up within the cache lifetime.

Archives for the categories and tags used by the newest 50 articles are prerendered at
build time; others, and all later archive pages, render on first request.

Archive metadata: title (`Category: Essays · …`, `Tagged “reflection”, page 2 · …`),
a description, and a canonical URL for the exact page when `SITE_URL` is set. Article
pages now also get a canonical URL when `SITE_URL` is set.

No migration was needed: the existing indexes `posts_category_published_idx` and
`post_tags_tag_id_idx` cover the archive queries.

### Verification (October 2026)

Against a production build (`next start`) with the live data (3 published posts):
category and tag archives, titles, descriptions, counts, and canonical URLs (with a
test `SITE_URL`); unknown, malformed, and out-of-range slugs and pages (404 with
`noindex` on repeat requests); `/page/1` redirects; related articles on all three
posts. Pagination was tested with the page size temporarily set to 1, then reverted.
Published-only visibility was tested in SQL as the `anon` role against draft, archived,
and scheduled posts and a draft-only category and tag, inside a transaction that was
rolled back. Not yet checked in a real browser: the responsive layout and keyboard
focus of the new links.

## Design

Tokens live in `src/app/globals.css` and are shared by the public site and admin.

- **Palette:** cream page (`--paper`), peach `#FFD2AF` blocks (`--peach`: header,
  footer, hero, newest cards, blockquotes), orange `#F97830` (`--orange`) for buttons,
  category stickers, and shapes, deep-brown ink for text. Orange text fails contrast
  on light backgrounds (about 2:1), so `--accent` (`#9C3D0A`, ≥ 4.9:1 on peach) is
  used where text needs the accent colour, and text on orange is always dark.
- **Type:** Fraunces with its `SOFT`/`WONK` axes turned up for headings (`font-serif`),
  and turned down for article body text so long reads stay calm; Bricolage Grotesque
  for UI (`font-sans`); Caveat for small handwritten notes (`font-hand`).
- **Stickers:** `sticker` (2px outline + hard orange offset shadow), `sticker-hover`,
  and `btn` / `btn-primary` / `btn-secondary` utilities.
- **Dark mode:** follows the OS by default. The header toggle stores an explicit
  choice in `localStorage` under `theme` (nothing is sent to the server), and an
  inline script in `<head>` applies it before paint so there's no flash.

## Reader features

| Route / feature | Notes |
| --- | --- |
| `/search?q=` | Postgres full-text search (title > excerpt > body) via a generated `search_vector` column with a GIN index (migration `20261020170052_post_search`). `websearch` syntax, so `"phrases"`, `or`, and `-exclude` work. Max 100 characters, 20 newest matches. `noindex`, and disallowed in robots.txt |
| `/topics` | Every category and tag with published posts, with counts |
| `/about` | The author (details supplied by the owner), what the blog covers, and contact links (email, Instagram, GitHub) |
| `/feed.xml` | RSS 2.0, newest 20 posts (title, excerpt, category, date) |
| `/sitemap.xml`, `/robots.txt` | Published posts, topics, and static pages only; `/admin` disallowed |
| Table of contents | On articles with 3+ Markdown headings: collapsible box on small screens, sticky side column on wide ones. Heading ids come from one remark plugin (`src/lib/headings.ts`) used for both rendering and the list, so links always match |
| Reading progress | CSS scroll-driven animation, no JavaScript; hidden where unsupported and for reduced-motion users |
| Share | Copy link always; X, Bluesky, LinkedIn, and email links once `SITE_URL` is set. Plain links, no third-party scripts |
| Link previews | `app/opengraph-image.tsx` (site default) and `app/blog/[slug]/opengraph-image.tsx` (title, category, and the cover when it is JPEG or PNG) render 1200 × 630 cards with `next/og` in the site's fonts (WOFF files and their SIL OFL licences in `assets/fonts`); large Twitter/X cards. Absolute image URLs need `SITE_URL` |
| Security headers | Set for every route in `next.config.ts`: CSP (no nonces, so `'unsafe-inline'` scripts are allowed; nonces would force per-request rendering), `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy, and HSTS in production |

Search runs through the anon client, so RLS still limits it to published posts. A
newsletter was deliberately not added: it needs a third-party email provider.

## Reader engagement

### What readers see

- **Likes:** a single "Like" toggle under each article with the total count. Pressing
  it again removes the like. The count updates immediately, then shows the server's
  authoritative value.
- **Comments:** approved comments, oldest first (up to 200 per article), then a form
  with **Name** and **Comment**. No account or email. Comments are plain text: React
  escapes them and nothing is parsed as Markdown or HTML. After sending, readers are
  told the comment will appear once approved.

### How it works

| Piece | Role |
| --- | --- |
| `setReaction`, `submitComment` (`src/app/blog/[slug]/actions.ts`) | Public Server Actions. Validate with Zod, compute hashes on the server, call the database functions with the service client. Generic error messages only |
| `submit_guest_comment()` | Checks that the post is public **now**, applies rate limits, inserts. The insert trigger forces `pending`, a server timestamp, and trimmed text |
| `set_post_reaction()` | Checks that the post is public now, applies rate limits, inserts (`ON CONFLICT DO NOTHING`) or deletes the visitor's like, and returns the new state and count in the same transaction |
| `get_post_reaction_state()` | Count plus "liked by this visitor" for the article page; no row for posts that aren't public |
| Insert triggers | Reject comments and reactions on drafts, archived, and **scheduled** posts even if a caller skips the functions |

All three functions are `SECURITY INVOKER` and executable by `service_role` only. A
caller holding just the publishable key cannot reach them, cannot insert into
`comments`/`reactions`, and cannot read reaction rows.

**Visitor identity (privacy):** the first like sets an HttpOnly, `SameSite=Lax` cookie
`reader_id` (Secure in production, one year) containing a random 256-bit id. The
database stores only `HMAC-SHA256(ENGAGEMENT_HASH_SECRET, id)` in `reactions.reactor_hash`.
Readers who never like anything get no cookie. Comments store only the name, text,
and timestamp: no IP, email, cookie, or hash.

**Rate limits** (fixed windows, counted in `private.rate_limits`, shared by all server
instances). The "client" is `HMAC(secret, IP)`, kept at most two days and never stored
with a comment or reaction.

| Action | Limits |
| --- | --- |
| Comment | 3 per 10 min and 10 per day per client; 30 per hour per post; no new comments while 500 are pending |
| Like / unlike | 20 changes per 10 min per visitor; 120 per hour per client; 50 new likes per day per client |

Other spam controls: a hidden honeypot field (if filled, the bot gets the normal success
message and nothing is stored), at most 3 links per comment, control and bidi-override
characters stripped, name up to 80 and comment 2 to 4,000 characters (the database
allows 5,000), and moderation before anything is public.

### Moderation

`/admin/comments` (linked from the dashboard with the pending count) lists comments
by status: **Pending** (default), **Approved**, **Rejected**, 25 per page, newest
first, with the post they belong to. Approve, reject (also "unapprove"), or delete
(two-step). `moderateComment` calls `requireOwner()` first and writes with the owner's
session, so RLS and the `status`-only column grant apply again. Each change calls
`updateTag("comments")`, so public articles show the change on the next request.

### Caching

Approved comments are cached (`"use cache"`, tag `comments`) and prerender with the
article. The like button reads the visitor cookie, so it is never cached and streams
in behind its own `<Suspense>` boundary; the rest of the article stays static.

### Limitations

- **IP-based limits depend on the host.** The client IP comes from `x-real-ip` or the
  first `x-forwarded-for` entry. Platforms like Vercel set these; behind a proxy that
  passes client-supplied values through, they can be spoofed, and requests without
  them share one "unknown" bucket.
- Clearing cookies lets someone like again; the per-client "50 new likes per day"
  limit bounds this, but someone with many IP addresses can still inflate counts.
- The site-wide cap of 500 pending comments means a flood can temporarily block new
  comments until you moderate. That protects the queue at the cost of availability.
- No CAPTCHA. Add one only if spam gets past the honeypot, limits, and moderation.
- Rejected comments are kept until deleted. Nothing deletes old comments automatically.
- Like counts are not shown on homepage cards, and the admin post list does not show
  per-post like or comment counts yet.
- Comment author names are not unique or verified; anyone can use any name.
- Changing `ENGAGEMENT_HASH_SECRET` resets every visitor's "liked" state (old likes
  still count but can't be removed by their authors) and all rate-limit counters.

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
