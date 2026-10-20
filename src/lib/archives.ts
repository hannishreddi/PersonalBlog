import "server-only";

import type { Metadata } from "next";

import { getArchivePage, type ArchiveKind } from "@/lib/posts";
import { canonicalAlternates } from "@/lib/site-url";

/** Public path of a category or tag archive page. Page 1 has no suffix. */
export function archivePath(kind: ArchiveKind, slug: string, page = 1): string {
  const base = `/${kind}/${slug}`;
  return page === 1 ? base : `${base}/page/${page}`;
}

/** Page numbers in URLs: positive integers without leading zeros. */
export function parsePageParam(raw: string): number | null {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

export function archiveTitle(kind: ArchiveKind, name: string): string {
  return kind === "category" ? `Category: ${name}` : `Tagged “${name}”`;
}

/**
 * Metadata for an archive page. Everything comes from getArchivePage, which
 * only returns terms with published posts, so unknown, empty, and draft-only
 * terms all get the same generic, unindexed "not found" metadata.
 */
export async function archiveMetadata(
  kind: ArchiveKind,
  slug: string,
  page: number | null,
): Promise<Metadata> {
  const archive = page === null ? null : await getArchivePage(kind, slug, page);
  if (!archive) return { title: "Archive not found", robots: { index: false } };

  const { name } = archive.term;
  const pageSuffix = archive.page > 1 ? `, page ${archive.page}` : "";
  const description =
    kind === "category"
      ? `Published writing in the ${name} category, newest first.`
      : `Published writing tagged “${name}”, newest first.`;

  return {
    title: `${archiveTitle(kind, name)}${pageSuffix}`,
    description,
    alternates: canonicalAlternates(archivePath(kind, archive.term.slug, archive.page)),
  };
}
