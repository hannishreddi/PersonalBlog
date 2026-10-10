import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { siteConfig } from "@/config/site";
import { mediaUrl, parseImagePath } from "@/lib/images";
import { estimateReadingTime } from "@/lib/reading-time";
import { createPublicClient } from "@/lib/supabase/public";
import type { CoverImage, PostSummary, PublishedPost } from "@/types/post";

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
  id, slug, title, excerpt, content_markdown, status,
  created_at, updated_at, published_at,
  cover_image_path, cover_image_alt,
  category:categories ( slug, name ),
  post_tags ( tag:tags ( slug, name ) )
` as const;

function publishedPosts() {
  return createPublicClient()
    .from("posts")
    .select(POST_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null);
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
      .flatMap(({ tag }) => (tag ? [tag.name] : []))
      .sort((a, b) => a.localeCompare(b)),
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
