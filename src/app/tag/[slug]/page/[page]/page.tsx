import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ArchiveView } from "@/components/posts/archive-view";
import { archiveMetadata, archivePath, parsePageParam } from "@/lib/archives";
import { getArchivePage, isTermSlug } from "@/lib/posts";

export async function generateStaticParams() {
  // Later archive pages render on first request. Cache Components requires
  // at least one param; this one can never exist and renders not-found.
  return [{ slug: "__none__", page: "2" }];
}

export async function generateMetadata(
  props: PageProps<"/tag/[slug]/page/[page]">,
): Promise<Metadata> {
  const { slug, page } = await props.params;
  return archiveMetadata("tag", slug, parsePageParam(page));
}

export default async function TagArchivePage(props: PageProps<"/tag/[slug]/page/[page]">) {
  const { slug, page: rawPage } = await props.params;
  const pageNumber = parsePageParam(rawPage);

  // Only redirect well-formed slugs; anything else falls through to not-found.
  if (pageNumber === 1 && isTermSlug("tag", slug)) redirect(archivePath("tag", slug));
  if (pageNumber === null) notFound();

  const archive = await getArchivePage("tag", slug, pageNumber);
  if (!archive) notFound();

  return <ArchiveView archive={archive} />;
}
