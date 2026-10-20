import "server-only";

/**
 * The public origin of the site (e.g. https://example.com), from SITE_URL.
 * Optional: without it, pages omit canonical URLs rather than guessing one,
 * because Next.js needs an absolute base (metadataBase) to resolve relative
 * canonical paths.
 */
export function getSiteUrl(): URL | null {
  const raw = process.env.SITE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** `alternates` metadata with a canonical path, or nothing if SITE_URL is unset. */
export function canonicalAlternates(path: string): { canonical: string } | undefined {
  return getSiteUrl() ? { canonical: path } : undefined;
}
