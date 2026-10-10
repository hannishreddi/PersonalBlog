# Personal blog

A standalone personal publication for essays, reflections, stories, and notes.
Project goals, stack decisions, and security requirements live in [`CLAUDE.md`](./CLAUDE.md).

## Current stage

Stage 2 of the plan in `CLAUDE.md` §11: public layout, homepage, and article pages,
backed by **mock data only**. There is no database, authentication, comments,
reactions, or image upload yet.

All posts, the publication name ("The Quiet Margin"), the tagline, and the author
label are placeholders. Edit them in `src/config/site.ts` and `src/content/mock-posts.ts`.

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
