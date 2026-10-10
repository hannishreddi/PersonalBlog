import { siteConfig } from "@/config/site";
import { mockPosts } from "@/content/mock-posts";
import { estimateReadingTime } from "@/lib/reading-time";
import type { Post, PostSummary, PublishedPost } from "@/types/post";

/*
 * Public data-access layer.
 *
 * Currently backed by in-memory mock data. Function signatures are async so
 * they can be replaced with Supabase queries later without touching pages.
 * All public reads go through `isPubliclyVisible`; drafts and archived posts
 * must never leave this module.
 */

function isPubliclyVisible(post: Post): post is Post & { status: "published"; publishedAt: string } {
  return post.status === "published" && post.publishedAt !== null;
}

function toPublished(post: Post & { status: "published"; publishedAt: string }): PublishedPost {
  return { ...post, readingTimeMinutes: estimateReadingTime(post.contentMarkdown) };
}

function toSummary(post: PublishedPost): PostSummary {
  const { contentMarkdown, ...summary } = post;
  return summary;
}

/** All published posts, newest first by publication time. */
function publishedPostsNewestFirst(): PublishedPost[] {
  return mockPosts
    .filter(isPubliclyVisible)
    .map(toPublished)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export interface PostPage {
  posts: PostSummary[];
  page: number;
  totalPages: number;
}

/** One bounded page of the public feed. Pages are 1-indexed. */
export async function getPublishedPostPage(page: number): Promise<PostPage | null> {
  const all = publishedPostsNewestFirst();
  const perPage = siteConfig.postsPerPage;
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));

  if (!Number.isInteger(page) || page < 1 || page > totalPages) return null;

  const start = (page - 1) * perPage;
  return {
    posts: all.slice(start, start + perPage).map(toSummary),
    page,
    totalPages,
  };
}

export async function getPublishedPageCount(): Promise<number> {
  return Math.max(1, Math.ceil(publishedPostsNewestFirst().length / siteConfig.postsPerPage));
}

export async function getPublishedPostBySlug(slug: string): Promise<PublishedPost | null> {
  return publishedPostsNewestFirst().find((post) => post.slug === slug) ?? null;
}

export async function getPublishedSlugs(): Promise<string[]> {
  return publishedPostsNewestFirst().map((post) => post.slug);
}

/** The chronologically adjacent published posts, for article footers. */
export async function getAdjacentPosts(
  slug: string,
): Promise<{ newer: PostSummary | null; older: PostSummary | null }> {
  const all = publishedPostsNewestFirst();
  const index = all.findIndex((post) => post.slug === slug);
  if (index === -1) return { newer: null, older: null };

  const newer = all[index - 1];
  const older = all[index + 1];
  return {
    newer: newer ? toSummary(newer) : null,
    older: older ? toSummary(older) : null,
  };
}
