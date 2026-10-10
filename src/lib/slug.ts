/**
 * URL slug rules shared by the editor (client) and Server Actions. They match
 * the database check constraints on posts, categories, and tags.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string, maxLength: number): boolean {
  return slug.length > 0 && slug.length <= maxLength && SLUG_PATTERN.test(slug);
}

/**
 * Lowercase ASCII words joined by hyphens. Accents are folded ("café" ->
 * "cafe"); other characters are dropped, so the result can be empty.
 */
export function slugify(text: string, maxLength: number): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}
