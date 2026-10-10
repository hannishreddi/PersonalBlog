/**
 * Shared content types. These mirror the planned database schema
 * (see CLAUDE.md §5) so the mock data layer can later be swapped for
 * Supabase queries without changing component contracts.
 */

export type PostStatus = "draft" | "published" | "archived";

export interface Category {
  slug: string;
  name: string;
}

export interface CoverImage {
  /** Storage path or local path; never an arbitrary trusted URL. */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  coverImage: CoverImage | null;
  category: Category | null;
  tags: string[];
  status: PostStatus;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** A published post as exposed to public pages. */
export interface PublishedPost extends Post {
  status: "published";
  publishedAt: string;
  readingTimeMinutes: number;
}

/** Card-level data: everything except the article body. */
export type PostSummary = Omit<PublishedPost, "contentMarkdown">;
