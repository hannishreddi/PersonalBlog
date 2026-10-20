-- =============================================================================
-- Full-text search over posts.
--
-- A stored, generated tsvector (title weighted above excerpt above body) with a
-- GIN index. Public search queries run through the anon client, so the
-- existing RLS policies still limit results to published, visible posts; this
-- migration adds no policies and grants nothing new.
-- =============================================================================

alter table public.posts
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('english'::regconfig, coalesce(excerpt, '')), 'B')
    || setweight(to_tsvector('english'::regconfig, coalesce(content_markdown, '')), 'C')
  ) stored;

create index posts_search_vector_idx
  on public.posts using gin (search_vector);
