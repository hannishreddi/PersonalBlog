/**
 * Shared content types used by components. `src/lib/posts.ts` maps
 * database rows (see `src/types/database.ts`) into these shapes, so
 * components never depend on column names.
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
