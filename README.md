<div align="center">

# Hannish Reddi

**A personal blog for essays, reflections, stories, and notes, written by A Hannish Reddi.**

Built for [hannishreddi.in](https://hannishreddi.in)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_·_Auth_·_Storage-3FCF8E?logo=supabase&logoColor=white)

</div>

---

## Overview

This is a single-author blog with a public reading site and a private writing desk.
Readers can browse, search, like, and comment without an account. The owner writes in
Markdown, uploads images, schedules posts, and moderates comments from `/admin`.

The design is meant to feel like a small independent publication: cream paper,
peach and orange accents, and type set in Fraunces, Bricolage Grotesque, and Caveat.

## Features

### For readers

- **Editorial home feed**: a tiered three-column grid on desktop (two on tablet, one
  on mobile), with posts strictly newest first and paginated.
- **Comfortable articles**: tuned typography, reading time, a table of contents for
  longer posts, a CSS-only reading progress bar, and related articles.
- **Discovery**: category and tag archives, a Topics page, and full-text search
  (Postgres `websearch` syntax, so `"phrases"`, `or`, and `-exclude` work).
- **Likes and comments**: one-tap likes and guest comments with just a name. Comments
  appear after moderation.
- **Light and dark themes**: light by default. A reader's choice is remembered in their
  browser and applied before the first paint, so the page never flashes.
- **Sharing and feeds**: copy link, X, Bluesky, LinkedIn, and email share links, an
  RSS feed, generated Open Graph cards, a sitemap, and robots rules.

### For the owner

- **Markdown editor** with live preview rendered by the same component as the public site.
- **Images**: upload a cover, or paste and drop inline images straight into the text,
  with progress, alt-text prompts, and layout-stable dimensions.
- **Publishing workflow**: draft, publish, schedule for later, unpublish, archive, and
  delete. Edits from a stale tab are rejected instead of overwriting newer work.
- **Comment moderation**: approve, reject, or delete comments from a queue.
- **Password reset from the terminal** with `npm run reset-password`. There is no public
  reset page.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) App Router, React Server Components, Server Actions |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, with design tokens in `src/app/globals.css` |
| Data | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (single owner, no public sign-up) |
| Files | Supabase Storage (private bucket served through `/media`) |
| Content | Markdown via `react-markdown` and `remark-gfm`; raw HTML is escaped |
| Validation | Zod on every Server Action and Route Handler |
| Icons | Lucide |

## Security and privacy

Security is enforced on the server and in the database, not by hiding UI.

- **Row Level Security on every table.** Anonymous readers can see only posts that are
  published with a publication time in the past, plus approved comments. Drafts,
  archived posts, and scheduled posts never reach public pages, search, feeds, or the
  sitemap.
- **Owner checks everywhere.** Every admin page, Server Action, and Route Handler
  verifies the session and confirms the user is the registered owner. The database then
  checks the same rule again.
- **Uploads are verified by their bytes**, not by file name or browser-reported type,
  and are stored under random, never-reused names. SVG is rejected.
- **Abuse controls** on comments and likes: rate limits shared across server instances,
  a honeypot field, link limits, and moderation before anything is public.
- **Minimal reader data.** Comments store only a name, the text, and a timestamp. A like
  sets one random, HttpOnly cookie, and the database stores only an HMAC of it. IP
  addresses are kept only as short-lived HMACs for rate limiting.
- **Security headers** (CSP, HSTS, `frame-ancestors 'none'`, and others) on every route.
  There are no analytics or third-party scripts.

## Getting started

### Prerequisites

- Node.js 20.12 or newer, and npm
- A [Supabase](https://supabase.com) project

### 1. Install

```bash
git clone https://github.com/hannishreddi/PersonalBlog.git
cd PersonalBlog
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Where it comes from | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page, the `sb_publishable_…` key | Public |
| `SUPABASE_SECRET_KEY` | Same page, the `sb_secret_…` key | **Server only** |
| `ENGAGEMENT_HASH_SECRET` | At least 32 random characters (generator command in `.env.example`) | **Server only** |
| `SITE_URL` | Your public origin, for example `https://hannishreddi.in` | Public; set it in production |

Never put a secret in a `NEXT_PUBLIC_*` variable. Without the two server-only secrets
the site still works, but likes are hidden and comments are closed. Without `SITE_URL`,
canonical links, the sitemap entries, and share links are left out.

### 3. Set up the database

Apply the SQL files in `supabase/migrations/` in filename order, with the
[Supabase CLI](https://supabase.com/docs/guides/local-development) (`supabase db push`)
or by running them in the SQL Editor. They create the tables, RLS policies, the private
`post-images` bucket, search, and the engagement functions.

### 4. Register the owner

There is no sign-up page, so turn off public sign-ups in Supabase Auth and create the owner
account under **Authentication → Users**. Then run this in the SQL Editor once:

```sql
insert into private.blog_owner (user_id)
select id from auth.users where email = 'you@example.com';
```

### 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000> for the blog, and <http://localhost:3000/admin/login> to
start writing.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build (needs the environment variables) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types, then run `tsc --noEmit` |
| `npm run reset-password` | Set a new owner password from an interactive terminal |

## Project structure

```text
src/
  app/                   routes (App Router)
    page.tsx             home feed
    blog/[slug]/         article page, likes and comments
    category/, tag/      archives
    search/, topics/, about/
    admin/               dashboard, post editor, comment moderation, image upload
    media/               public delivery of published images
  components/            layout, post cards, article renderer, engagement UI
  config/site.ts         site name, tagline, author
  lib/                   data access, auth checks, validation limits, Supabase clients
supabase/migrations/     database schema, RLS, and storage policies
scripts/                 owner password reset
assets/fonts/            fonts for Open Graph images (SIL OFL)
```

Public pages read data only through `src/lib/posts.ts`, which uses a cookie-less
anonymous client, so even the owner's own session can't leak drafts onto public pages.
Results are cached and refreshed whenever a post or comment changes.

## Known limitations

- There is no automated test suite yet. Changes are checked with lint, type checking, a
  production build, and manual testing.
- Categories and tags can't be renamed or deleted from the admin yet. Use the Supabase
  dashboard.
- IP-based rate limits rely on the host setting `x-real-ip` or `x-forwarded-for`
  correctly, as Vercel does.
- The first request for an unknown slug streams a `noindex` not-found page with HTTP 200.
  Later requests return 404.
