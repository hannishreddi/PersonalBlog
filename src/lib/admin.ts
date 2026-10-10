import "server-only";

import { connection } from "next/server";

import { requireOwner } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import type { PostStatus } from "@/types/post";

/*
 * Owner-only data access. Each function authorizes itself with
 * requireOwner() and then queries with the owner's session, so RLS enforces
 * the same rule a second time in the database.
 */

export const POST_STATUSES: readonly PostStatus[] = ["draft", "published", "archived"];

/** Posts per page in the admin list. */
export const ADMIN_POSTS_PER_PAGE = 20;

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === "string" && (POST_STATUSES as readonly string[]).includes(value);
}

function fail(what: string): never {
  // Keep database details out of rendered errors.
  throw new Error(`Could not load ${what}.`);
}

export async function getPostStatusCounts(): Promise<Record<PostStatus, number>> {
  await requireOwner();
  const supabase = await createSessionClient();

  const entries = await Promise.all(
    POST_STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (error) fail("post counts");
      return [status, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<PostStatus, number>;
}

export interface AdminPostListItem {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  updatedAt: string;
  publishedAt: string | null;
}

export interface AdminPostPage {
  posts: AdminPostListItem[];
  page: number;
  totalPages: number;
  /** When the list was read (ms since epoch), for telling scheduled posts apart. */
  loadedAt: number;
}

/** One page of posts, most recently edited first. Pages are 1-indexed. */
export async function listAdminPosts(status: PostStatus | null, page: number): Promise<AdminPostPage> {
  await requireOwner();
  // loadedAt reads the clock, which must happen at request time.
  await connection();
  const supabase = await createSessionClient();

  const from = (page - 1) * ADMIN_POSTS_PER_PAGE;
  let query = supabase
    .from("posts")
    .select("id, title, slug, status, updated_at, published_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + ADMIN_POSTS_PER_PAGE - 1);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  // PostgREST rejects ranges past the end (416) when rows exist.
  if (error && error.code !== "PGRST103") fail("posts");

  return {
    posts: (data ?? []).flatMap((row) =>
      isPostStatus(row.status)
        ? [
            {
              id: row.id,
              title: row.title,
              slug: row.slug,
              status: row.status,
              updatedAt: row.updated_at,
              publishedAt: row.published_at,
            },
          ]
        : [],
    ),
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / ADMIN_POSTS_PER_PAGE)),
    loadedAt: Date.now(),
  };
}

/** Everything the editor needs for one post, in any status. */
export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  categoryName: string;
  tagNames: string[];
  /** Storage path in the post-images bucket, or null. */
  coverImagePath: string | null;
  coverImageAlt: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /** When the post was read (ms since epoch). */
  loadedAt: number;
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  await requireOwner();
  // loadedAt reads the clock, which must happen at request time.
  await connection();
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, title, slug, excerpt, content_markdown, status,
       created_at, updated_at, published_at,
       cover_image_path, cover_image_alt,
       category:categories ( name ),
       post_tags ( tag:tags ( name ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("the post");
  if (!data || !isPostStatus(data.status)) return null;

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    contentMarkdown: data.content_markdown,
    categoryName: data.category?.name ?? "",
    tagNames: data.post_tags
      .flatMap(({ tag }) => (tag ? [tag.name] : []))
      .sort((a, b) => a.localeCompare(b)),
    coverImagePath: data.cover_image_path,
    coverImageAlt: data.cover_image_alt ?? "",
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    publishedAt: data.published_at,
    loadedAt: Date.now(),
  };
}

/** Existing category and tag names, offered as suggestions in the editor. */
export async function getTaxonomyNames(): Promise<{ categories: string[]; tags: string[] }> {
  await requireOwner();
  const supabase = await createSessionClient();

  const [categories, tags] = await Promise.all([
    supabase.from("categories").select("name").order("name").limit(200),
    supabase.from("tags").select("name").order("name").limit(200),
  ]);
  if (categories.error || tags.error) fail("categories and tags");

  return {
    categories: categories.data.map((row) => row.name),
    tags: tags.data.map((row) => row.name),
  };
}
