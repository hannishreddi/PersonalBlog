import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { siteConfig } from "@/config/site";
import { mediaUrl, parseImagePath } from "@/lib/images";
import { POST_LIMITS } from "@/lib/post-limits";
import { estimateReadingTime } from "@/lib/reading-time";
import { isValidSlug } from "@/lib/slug";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, CoverImage, PostSummary, PublishedPost, Tag } from "@/types/post";

/*
 * Public data-access layer, backed by Supabase.
 *
 * Every query uses the cookie-less anon client, so RLS only ever returns
 * posts with status = 'published' and published_at <= now(). The explicit
 * filters below repeat that rule so this module stays correct on its own.
 * Drafts, archived, and scheduled posts never leave this module.
 *
 * Results are cached for a few minutes and tagged "posts" so future admin
 * mutations can refresh them with updateTag/revalidateTag. A scheduled post
 * therefore appears within one cache lifetime of its publication time.
 */

export const POSTS_CACHE_TAG = "posts";

/** How many of the newest articles are prerendered at build time. */
const PRERENDERED_ARTICLES = 50;

const POST_COLUMNS = `
  id, slug, title, excerpt, content_markdown, status, category_id,
  created_at, updated_at, published_at,
  cover_image_path, cover_image_alt,
  category:categories ( slug, name ),
  post_tags ( tag_id, tag:tags ( slug, name ) )
` as const;

/*
 * Tag archives filter on a second, inner-joined embedding of post_tags so the
 * main post_tags embedding above still returns every tag of each post.
 */
const TAGGED_POST_COLUMNS = `${POST_COLUMNS}, tag_filter:post_tags!inner ( tag_id )` as const;

function publishedPosts() {
  return createPublicClient()
    .from("posts")
    .select(POST_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null);
}

/** Published posts carrying at least one of the given tags. */
function publishedPostsWithTags(tagIds: string[]) {
  return createPublicClient()
    .from("posts")
    .select(TAGGED_POST_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null)
    .in("tag_filter.tag_id", tagIds);
}

type PostRow = NonNullable<Awaited<ReturnType<typeof publishedPosts>>["data"]>[number];

/**
 * Covers are served from /media, which only returns images referenced by a
 * published post (see README "Image delivery"). Dimensions come from the
 * canonical path; anything not in that format falls back to generated art.
 */
function toCoverImage(row: PostRow): CoverImage | null {
  const image = row.cover_image_path ? parseImagePath(row.cover_image_path) : null;
  if (!image) return null;
  return { src: mediaUrl(image.path), alt: row.cover_image_alt ?? "", width: image.width, height: image.height };
}

function toPublished(row: PostRow): PublishedPost {
  if (row.status !== "published" || row.published_at === null) {
    // RLS and the query filters make this unreachable; refuse rather than leak.
    throw new Error("Refusing to expose an unpublished post.");
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    coverImage: toCoverImage(row),
    category: row.category ? { slug: row.category.slug, name: row.category.name } : null,
    tags: row.post_tags
      .flatMap(({ tag }) => (tag ? [{ slug: tag.slug, name: tag.name }] : []))
      .sort((a, b) => a.name.localeCompare(b.name)),
    status: "published",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    readingTimeMinutes: estimateReadingTime(row.content_markdown),
  };
}

function toSummary(post: PublishedPost): PostSummary {
  const { contentMarkdown, ...summary } = post;
  return summary;
}

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / siteConfig.postsPerPage));
}

function fail(what: string): never {
  // Keep database details out of rendered errors.
  throw new Error(`Could not load ${what}.`);
}

export interface PostPage {
  posts: PostSummary[];
  page: number;
  totalPages: number;
}

/** One bounded page of the public feed, newest first. Pages are 1-indexed. */
export async function getPublishedPostPage(page: number): Promise<PostPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  if (!Number.isInteger(page) || page < 1) return null;

  const perPage = siteConfig.postsPerPage;
  const from = (page - 1) * perPage;
  const { data, count, error } = await publishedPosts()
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + perPage - 1);

  // PostgREST rejects ranges past the end (416) when the table is non-empty.
  if (error && error.code !== "PGRST103") fail("posts");

  const totalPages = pageCount(count ?? 0);
  if (page > totalPages) return null;

  return { posts: (data ?? []).map(toPublished).map(toSummary), page, totalPages };
}

export async function getPublishedPageCount(): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { count, error } = await createPublicClient()
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .not("published_at", "is", null);
  if (error) fail("posts");

  return pageCount(count ?? 0);
}

export async function getPublishedPostBySlug(slug: string): Promise<PublishedPost | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  // Malformed slugs can't exist in the database (see the slug check constraint).
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;

  const { data, error } = await publishedPosts().eq("slug", slug).maybeSingle();
  if (error) fail("the post");

  return data ? toPublished(data) : null;
}

/** Slugs of the newest posts, for prerendering. Older posts render on first request. */
export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select("slug")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PRERENDERED_ARTICLES);
  if (error) fail("posts");

  return data.map((row) => row.slug);
}

/** The chronologically adjacent published posts, for article footers. */
export async function getAdjacentPosts(
  slug: string,
): Promise<{ newer: PostSummary | null; older: PostSummary | null }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const current = await getPublishedPostBySlug(slug);
  if (!current) return { newer: null, older: null };

  // Feed order is (published_at desc, id desc); ties on published_at fall back to id.
  const at = current.publishedAt;
  const id = current.id;

  const [newer, older] = await Promise.all([
    publishedPosts()
      .or(`published_at.gt.${at},and(published_at.eq.${at},id.gt.${id})`)
      .order("published_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    publishedPosts()
      .or(`published_at.lt.${at},and(published_at.eq.${at},id.lt.${id})`)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (newer.error || older.error) fail("adjacent posts");

  return {
    newer: newer.data ? toSummary(toPublished(newer.data)) : null,
    older: older.data ? toSummary(toPublished(older.data)) : null,
  };
}

export type ArchiveKind = "category" | "tag";

export interface ArchivePage extends PostPage {
  kind: ArchiveKind;
  term: Category | Tag;
  /** Published posts in the whole archive, not just this page. */
  totalPosts: number;
}

/** Whether a category or tag slug is well-formed (see the database checks). */
export function isTermSlug(kind: ArchiveKind, slug: string): boolean {
  return isValidSlug(slug, kind === "category" ? POST_LIMITS.categorySlug : POST_LIMITS.tagSlug);
}

async function findTerm(kind: ArchiveKind, slug: string) {
  const client = createPublicClient();
  const { data, error } =
    kind === "category"
      ? await client.from("categories").select("id, slug, name").eq("slug", slug).maybeSingle()
      : await client.from("tags").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (error) fail(kind === "category" ? "the category" : "the tag");
  return data;
}

/**
 * One page of a category or tag archive, newest first. Returns null for
 * unknown terms, out-of-range pages, and terms with no published posts.
 * Categories and tags are readable on their own, so a term used only by
 * drafts or scheduled posts would otherwise reveal its name; it is treated
 * exactly like a term that doesn't exist.
 */
export async function getArchivePage(
  kind: ArchiveKind,
  slug: string,
  page: number,
): Promise<ArchivePage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  if (!isTermSlug(kind, slug) || !Number.isInteger(page) || page < 1) return null;

  const term = await findTerm(kind, slug);
  if (!term) return null;

  const perPage = siteConfig.postsPerPage;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, count, error } =
    kind === "category"
      ? await publishedPosts()
          .eq("category_id", term.id)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to)
      : await publishedPostsWithTags([term.id])
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);

  // PostgREST rejects ranges past the end (416) when matching rows exist.
  if (error && error.code !== "PGRST103") fail("posts");

  const totalPosts = count ?? 0;
  if (totalPosts === 0) return null;
  const totalPages = pageCount(totalPosts);
  if (page > totalPages) return null;

  return {
    kind,
    term: { slug: term.slug, name: term.name },
    totalPosts,
    posts: (data ?? []).map(toPublished).map(toSummary),
    page,
    totalPages,
  };
}

/**
 * Category and tag slugs used by the newest articles, for prerendering their
 * archives. Other archives render on first request.
 */
export async function getArchiveSlugs(kind: ArchiveKind): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select("category:categories ( slug ), post_tags ( tag:tags ( slug ) )")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PRERENDERED_ARTICLES);
  if (error) fail("archives");

  const slugs = data.flatMap((row) =>
    kind === "category"
      ? row.category
        ? [row.category.slug]
        : []
      : row.post_tags.flatMap(({ tag }) => (tag ? [tag.slug] : [])),
  );
  return [...new Set(slugs)];
}

/** Candidates fetched per signal (shared category, shared tags) before ranking. */
const RELATED_CANDIDATES = 12;

/**
 * Published posts related to the given one: those sharing its category or any
 * of its tags, ranked by how many of those they share (category counts once,
 * each tag once), then newest first. Never includes the post itself.
 */
export async function getRelatedPosts(slug: string, limit: number): Promise<PostSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data: current, error } = await createPublicClient()
    .from("posts")
    .select("id, category_id, post_tags ( tag_id )")
    .eq("status", "published")
    .not("published_at", "is", null)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("related posts");
  if (!current) return [];

  const categoryId = current.category_id;
  const tagIds = current.post_tags.map(({ tag_id }) => tag_id);

  const [byCategory, byTags] = await Promise.all([
    categoryId
      ? publishedPosts()
          .eq("category_id", categoryId)
          .neq("id", current.id)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(RELATED_CANDIDATES)
      : null,
    tagIds.length > 0
      ? publishedPostsWithTags(tagIds)
          .neq("id", current.id)
          .order("published_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(RELATED_CANDIDATES)
      : null,
  ]);
  if (byCategory?.error || byTags?.error) fail("related posts");

  const candidates = new Map<string, PostRow>();
  for (const row of [...(byCategory?.data ?? []), ...(byTags?.data ?? [])]) {
    candidates.set(row.id, row);
  }

  const score = (row: PostRow) =>
    (categoryId !== null && row.category_id === categoryId ? 1 : 0) +
    row.post_tags.filter(({ tag_id }) => tagIds.includes(tag_id)).length;

  return [...candidates.values()]
    .map((row) => ({ row, score: score(row) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.row.published_at!.localeCompare(a.row.published_at!) ||
        b.row.id.localeCompare(a.row.id),
    )
    .slice(0, limit)
    .map(({ row }) => toSummary(toPublished(row)));
}

/** Upper bound on posts scanned to build the topic index and sitemap. */
const INDEX_SCAN_LIMIT = 2000;

export interface TopicCount {
  slug: string;
  name: string;
  /** Published posts using this category or tag. */
  count: number;
}

export interface Topics {
  categories: TopicCount[];
  tags: TopicCount[];
}

function countTerms(terms: { slug: string; name: string }[]): TopicCount[] {
  const counts = new Map<string, TopicCount>();
  for (const { slug, name } of terms) {
    const entry = counts.get(slug);
    if (entry) entry.count++;
    else counts.set(slug, { slug, name, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Categories and tags with at least one published post, most used first.
 * Derived from published posts only, so terms used solely by drafts or
 * scheduled posts are never listed.
 */
export async function getTopics(): Promise<Topics> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select("category:categories ( slug, name ), post_tags ( tag:tags ( slug, name ) )")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(INDEX_SCAN_LIMIT);
  if (error) fail("topics");

  return {
    categories: countTerms(data.flatMap((row) => (row.category ? [row.category] : []))),
    tags: countTerms(data.flatMap((row) => row.post_tags.flatMap(({ tag }) => (tag ? [tag] : [])))),
  };
}

/** Longest search query accepted, in characters. */
export const SEARCH_QUERY_MAX = 100;
/** Search results shown; the page says when there may be more. */
export const SEARCH_RESULT_LIMIT = 20;

/**
 * Full-text search over published posts (title, excerpt, body), newest
 * first. Uses Postgres `websearch_to_tsquery`, so quotes, `or`, and `-word`
 * work and arbitrary input can't produce a syntax error.
 */
export async function searchPublishedPosts(query: string): Promise<PostSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const q = query.trim();
  if (q.length === 0 || q.length > SEARCH_QUERY_MAX) return [];

  const { data, error } = await publishedPosts()
    .textSearch("search_vector", q, { type: "websearch", config: "english" })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SEARCH_RESULT_LIMIT);
  if (error) fail("search results");

  return data.map(toPublished).map(toSummary);
}

/** The newest published posts, for the RSS feed. */
export async function getRecentPosts(limit: number): Promise<PostSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data, error } = await publishedPosts()
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) fail("posts");

  return data.map(toPublished).map(toSummary);
}

export interface SitemapPost {
  slug: string;
  updatedAt: string;
}

/** Slugs and last-modified times of published posts, for the sitemap. */
export async function getSitemapPosts(): Promise<SitemapPost[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(INDEX_SCAN_LIMIT);
  if (error) fail("posts");

  return data.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }));
}
