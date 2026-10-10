/**
 * Field limits for the post editor. They mirror the database check
 * constraints (see supabase/migrations) so validation fails early with a
 * readable message instead of a constraint error.
 */
export const POST_LIMITS = {
  title: 200,
  slug: 120,
  excerpt: 500,
  content: 200_000,
  categoryName: 80,
  categorySlug: 80,
  tagName: 80,
  tagSlug: 80,
  tagsPerPost: 10,
} as const;
