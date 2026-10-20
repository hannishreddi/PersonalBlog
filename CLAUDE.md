# CLAUDE.md — Personal Thoughts & Blogging Website

This file defines the product goals, technical decisions, security requirements, and working practices for this project. Follow it as the primary project guidance unless the user explicitly changes a decision.

## 1. Project Identity and Purpose

This is a **standalone personal blogging website for sharing personal thoughts, reflections, opinions, stories, and essays with readers**.

The blog is called **Hannish Reddi**, is written by **A Hannish Reddi**, and will be served at **`hannishreddi.in`** (decided by the owner in October 2026). It is still a blog, not a portfolio: **do not turn it into a personal portfolio, a résumé site, or a project showcase.** Do not add portfolio sections, career-oriented branding, project galleries, or similar features unless explicitly requested. The About page holds reader-worthy facts about the author (who they are, what they study, what they aspire to), supplied by the owner.

The website should feel personal, thoughtful, editorial, calm, and inviting. Prioritize reading comfort, writing quality, and easy discovery of posts over flashy effects or dashboard complexity.

### Primary goals

1. Provide a beautiful, accessible public website for discovering and reading posts.
2. Give the owner a private admin dashboard to draft, edit, publish, unpublish, and delete posts.
3. Support cover images and images embedded within articles.
4. Let readers react to posts and submit comments, with sensible spam controls and moderation.
5. Deliver strong mobile reading, SEO, performance, and accessibility.
6. Keep the implementation maintainable and proportionate to a single-author blog.

## 2. Decisions Already Made

Do not repeatedly ask the user to choose among these options. Use these defaults unless the user explicitly asks to revisit them.

### Application stack

- **Framework:** Next.js App Router
- **Language:** TypeScript with strict type checking
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** **Supabase PostgreSQL**
- **Admin authentication:** Supabase Auth, configured for a single blog owner
- **Image storage:** Supabase Storage
- **Input validation:** Zod
- **Deployment target:** A platform that supports the chosen Next.js server features; verify deployment compatibility before making platform-specific assumptions.

### Why PostgreSQL and Supabase

This blog has naturally relational data: posts, categories, tags, comments, reactions, and moderation states. PostgreSQL provides relational constraints and transactions that help keep this data consistent. Supabase combines managed PostgreSQL with authentication and object storage, reducing the number of services that need to be configured and maintained.

Use Supabase for the database, owner authentication, and image storage to start. Do not introduce MongoDB, Firebase, a separate backend service, or a second storage provider without first explaining a concrete need and receiving approval.

### Initial reader identity model

- Only the owner needs an account.
- Readers can comment using a display name without creating an account.
- Guest comments must be subject to validation, rate limiting, spam prevention, and moderation.
- Readers may react without creating an account. Use a privacy-conscious, abuse-resistant design and enforce uniqueness server-side where feasible. Do not rely on a client-side counter as the source of truth.
- Do not add reader OAuth or mandatory reader registration unless the user requests it.

## 3. Product Scope

### Public website

Required routes and experiences:

- `/` — Home feed showing published posts in reverse chronological order.
- `/blog/[slug]` — Individual article page.
- `/category/[slug]` — Category archive, if categories are implemented in the initial build.
- `/tag/[slug]` — Tag archive, if tags are implemented in the initial build.
- `/about` — A short author/about page only if requested or agreed as part of the design.
- Custom not-found and error states.

The homepage should help visitors discover writing without feeling like a generic SaaS landing page. Use restrained typography, good spacing, clear post metadata, and a recognizable editorial identity. Do not invent an author biography or personal details; ask the user or use clearly marked placeholder copy.

### Article experience

Each article should support:

- Title, slug, excerpt, category, tags, cover image, publication date, and estimated reading time.
- Comfortable typography and line length.
- Headings, paragraphs, emphasis, links, lists, blockquotes, and code blocks where appropriate.
- Inline images with alt text and responsive sizing.
- Like/reaction control and comment section.
- Related or recent posts only when useful; do not add filler content just to populate the page.
- Shareable canonical URL and social preview metadata.

Reading time should be calculated from the article content rather than manually hardcoded.

### Admin dashboard

Required owner workflows:

- Secure login and logout.
- View posts grouped or filtered by draft/published/archived status.
- Create, edit, preview, publish, unpublish, archive, and delete posts.
- Edit title, slug, excerpt, category, tags, cover image, and article content.
- Upload a cover image and insert inline images from the user's computer.
- Review, approve, reject, and delete reader comments.
- See post reaction and comment counts.
- Show clear success, loading, validation, empty, and error states.

A full analytics dashboard is **not** required for the first version. Do not claim to track views or analytics until tracking, privacy expectations, and data storage have actually been implemented.

## 4. Homepage Layout and Post Hierarchy

The preferred desktop homepage uses a responsive three-column editorial grid with visual tiers:

- First row: the three newest posts receive the largest cards.
- Second row: the next three posts receive medium cards.
- Third row and later: older posts use compact cards.
- Desktop: three columns.
- Tablet: two columns.
- Mobile: one column.

Treat the tiered layout as a visual hierarchy, not as permission to reorder the feed. The underlying post order must remain reverse chronological, and the mobile reading order must be unambiguous. Verify keyboard and screen-reader order as well as visual order.

Use progressively restrained corner radii (for example, `rounded-3xl`, `rounded-2xl`, and `rounded-xl`) only if they fit the final visual design. Do not force different radii if they make the interface feel inconsistent.

Cards may show:

- Cover image
- Category
- Title
- Short excerpt
- Publication date
- Reading time
- Reaction count
- Approved comment count

Requirements:

- Never truncate a title in a way that makes it unreadable.
- Keep card image ratios consistent within a tier.
- Provide a sensible fallback when a post has no cover image.
- Do not let image dimensions cause layout shifts.
- If there are fewer than nine posts, render the available posts naturally without empty placeholder cards.
- Ensure sorting is based on publication time, not creation time or visual card size.
- Include pagination or a “load more” strategy when the archive grows; avoid fetching every post indefinitely.

## 5. Content Model and Data Rules

Define shared TypeScript types and matching database schema/migrations. Prefer database-generated IDs and timestamps.

### Post

A post should have fields equivalent to:

- `id`
- `title`
- `slug` — unique, URL-safe
- `excerpt`
- `content_markdown`
- `cover_image_path` — storage path, not an arbitrary trusted URL
- `category_id` or an explicitly defined category field
- `status` — `draft`, `published`, or `archived`
- `created_at`
- `updated_at`
- `published_at` — nullable until publication
- Optional SEO title/description if genuinely needed

Only posts with `status = published` and a valid `published_at` may appear publicly. Draft and archived posts must never leak through public queries, metadata, search, feeds, or related-post components.

### Categories and tags

Use a simple category model and a normalized tag model if multiple tags are supported. Add database uniqueness constraints for slugs and join records. Avoid introducing a complex taxonomy system without a real requirement.

### Comments

A comment should include fields equivalent to:

- `id`
- `post_id`
- `author_name`
- `content`
- `status` — `pending`, `approved`, or `rejected`
- `created_at`
- Optional `parent_id` only if threaded replies are explicitly implemented.

Public readers can submit comments, but only approved comments are displayed publicly. Do not implement threaded replies in the initial version unless specifically requested.

### Reactions

Keep reaction records separate from post content. Enforce uniqueness using a server-validated reaction identity and post ID, where feasible. Counts should be computed from or transactionally maintained alongside the authoritative reaction records. Handle repeated submissions safely.

Do not allow the browser to submit an arbitrary `likesCount` or `commentsCount` value and save it as truth.

### Data consistency

- Add foreign keys, unique constraints, sensible indexes, and deletion behavior.
- Index published post ordering and slug lookups.
- Use database transactions or atomic operations where consistency requires them.
- Define whether deleting a post removes or retains its comments and reactions; implement that behavior consistently.
- Keep `created_at`, `updated_at`, and `published_at` semantically distinct.
- Use database migrations for schema changes; do not rely on undocumented manual dashboard edits.

## 6. Article Editor and Image Handling

### Writing format

Start with a Markdown editor and live preview unless the user explicitly requests a WYSIWYG editor. Support common Markdown features and provide clear writing ergonomics. Do not build a custom editor from scratch if a maintained library meets the need.

Store the canonical article body as Markdown. Render it through a maintained Markdown pipeline with appropriate sanitization and safe link handling. Do not render arbitrary untrusted HTML directly.

### Image upload workflow

- The owner can select or drag image files into the editor.
- Upload files to a dedicated Supabase Storage bucket using authenticated, authorized server-side or appropriately policy-protected upload flows.
- Store stable storage paths in post content or metadata rather than depending on temporary local file URLs.
- Insert uploaded image references into Markdown at the cursor position.
- Support alt text and responsive rendering.
- Validate MIME type, extension, and file size on the server; do not trust browser-provided file metadata alone.
- Use randomized or collision-resistant storage names and avoid overwriting unrelated files.
- Show upload progress, success, and failure feedback.
- Do not expose service-role keys in client bundles.
- Define how unused images are handled; do not automatically delete an image that may still be referenced by another post.

## 7. Authentication and Security Requirements

Security is a requirement, not a later polish task.

### Admin access

- Configure Supabase Auth for the blog owner.
- Do not provide public admin registration.
- The admin dashboard and all write operations must require a valid authenticated owner session.
- Enforce authorization server-side for every mutation and protected data request. Hiding admin links or protecting only the dashboard page is insufficient.
- Treat every Server Action and Route Handler as an endpoint that can be called directly.
- Use secure cookie-based session handling supported by the chosen Supabase/Next.js integration.
- Never put secrets, service-role keys, or privileged database credentials in client-side code or public environment variables.

### Supabase and database security

- Enable and test Row Level Security (RLS) for tables exposed through Supabase APIs.
- Define explicit least-privilege policies for public reads, guest comment submissions, owner writes, and storage uploads.
- Public readers may read published posts and approved comments only.
- Public users must not be able to update posts, change moderation status, edit reaction counts, or access drafts.
- Never assume a hidden UI or unguessable route provides authorization.
- Keep privileged server-only code in server-only modules and return only the data required by the client.

### Input and abuse protection

- Validate all form input on the server with Zod or an equivalent schema.
- Enforce reasonable length limits on titles, names, excerpts, comments, and content.
- Sanitize Markdown-rendered content and protect against stored XSS.
- Add rate limiting and spam mitigation to guest comments and reactions. Use an implementation suitable for the deployment environment; do not pretend an in-memory limiter is reliable across multiple server instances.
- Consider a honeypot or CAPTCHA only if spam risk justifies the added friction.
- Use safe redirects and validate URL schemes for links.
- Add appropriate security headers and safe error handling.
- Do not log passwords, session tokens, secrets, or unnecessary personal data.

## 8. SEO, Accessibility, Performance, and Privacy

### SEO

- Generate page titles and descriptions from post metadata.
- Use canonical URLs and appropriate Open Graph/social metadata.
- Add a sitemap and robots configuration.
- Ensure drafts and unpublished posts are not included in public metadata, sitemap, feeds, or search results.
- Use semantic HTML and stable, readable slugs.
- Add structured data only when it accurately describes the page.

### Accessibility

- Use semantic landmarks and a logical heading hierarchy.
- Ensure keyboard navigation, visible focus states, and accessible forms.
- Provide alt text for meaningful images and empty alt text for decorative images.
- Maintain sufficient contrast and respect reduced-motion preferences.
- Do not communicate status by color alone.
- Make reaction and comment controls usable by assistive technology.

### Performance

- Prefer server-rendered content for public article pages when appropriate.
- Optimize images and reserve their layout space.
- Avoid unnecessary client-side JavaScript and animation.
- Use pagination or bounded queries for archives.
- Avoid adding dependencies without a clear benefit.

### Privacy

- Collect only the reader information needed for comments and abuse prevention.
- Explain any persistent identifiers used for reactions if they are introduced.
- Do not add invasive analytics, tracking pixels, or third-party scripts without approval.
- Do not expose private reader information in public responses or logs.

## 9. Visual and Interaction Principles

The design should feel like an independent personal publication, not an admin template or a generic startup landing page.

- Prioritize typography, whitespace, article readability, and a coherent editorial system.
- Use animation sparingly and only when it improves feedback or navigation.
- Keep public reading pages visually distinct from the admin interface while maintaining shared design tokens.
- Use responsive layouts and real content lengths when evaluating designs.
- Include skeleton/loading states only where they improve perceived responsiveness; include helpful empty and error states.
- Use consistent spacing, color tokens, typography scales, borders, and focus styles.
- Avoid excessive gradients, glassmorphism, shadows, animated backgrounds, and decorative UI unless the chosen art direction specifically calls for them.
- Do not invent personal stories, opinions, post content, testimonials, or biographical details. Use clearly labeled placeholder content during development.

## 10. Development Workflow for Claude

Follow this process on each task:

1. **Inspect first.** Read the repository structure, package manifest, existing components, routes, configuration, and relevant tests before editing.
2. **Preserve context.** Do not replace working code or rewrite unrelated files just to match a preferred structure.
3. **Plan briefly.** Identify the files and behavior likely to change. For significant architectural changes, explain the trade-offs before proceeding.
4. **Implement incrementally.** Make the smallest coherent change that satisfies the request.
5. **Validate.** Run available lint, TypeScript, test, and production-build commands. If a command cannot run, state why; never claim it passed.
6. **Check the user experience.** Verify responsive behavior, loading/error/empty states, keyboard access, and the relevant happy path.
7. **Report honestly.** Summarize what changed, which checks ran, and what remains incomplete.

### Dependency and configuration discipline

- Inspect the existing package manager and lockfile; do not mix package managers.
- Do not install a dependency if the existing stack already provides an adequate solution.
- Document required environment variables in `.env.example` using placeholder values only.
- Never overwrite `.env.local` or other user secrets.
- Do not commit credentials, tokens, real user data, or generated secret files.
- Add migrations and setup notes for any database or storage configuration changes.

### Definition of done

A feature is not complete merely because its interface looks correct.

When relevant, distinguish between:

- UI implemented
- Data persisted
- Authentication/authorization enforced
- Validation and abuse controls implemented
- Tests/checks passed
- Deployment configuration verified

Never claim production readiness without evidence that the relevant checks and configuration have been completed.

## 11. Recommended Implementation Sequence

Build in small, reviewable stages:

1. Inspect the existing repository and establish the visual direction.
2. Create the public layout, responsive homepage, article page, and realistic mock content.
3. Define database migrations, content types, and a data-access layer.
4. Configure Supabase project integration, environment variables, RLS, and storage policies.
5. Implement owner authentication and protect all admin operations.
6. Implement Markdown authoring, preview, cover uploads, and inline image insertion.
7. Implement publishing workflows and public article queries.
8. Implement moderated guest comments and reactions with server-side validation and abuse controls.
9. Add SEO metadata, sitemap, accessibility improvements, and performance checks.
10. Run the full validation workflow and document deployment/setup steps.

Do not start a later stage by pretending an earlier stage's mock functionality is already persistent or secure.

## 12. Commands and Project Setup

Inspect the existing project before running setup commands. For a new project, use the package manager selected by the repository and follow the current official Next.js and Supabase documentation.

Common commands, when scripts exist:

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Do not assume every script is configured. If `lint`, `typecheck`, or `test` is missing, report that fact and add appropriate scripts only when it fits the project's current tooling.

## 13. Decision Protocol

The stack and database choices above are already settled. Do not ask the user to choose a database, framework, or image provider again.

Ask concise questions only when a decision materially affects product behavior, security, cost, or design and cannot reasonably be inferred from this document. Offer a recommended default with a short explanation. Ask no more than two questions at a time.

For ordinary implementation details, choose a sensible, maintainable default and proceed. If a requirement is ambiguous but low-risk, state the assumption and continue. If a decision would cause significant rework or a security risk, pause and clarify before committing to it.
