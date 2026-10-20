import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ArchiveFrame, ArchiveSkeleton, ArchiveView } from "@/components/posts/archive-view";
import { archiveMetadata, archivePath, parsePageParam } from "@/lib/archives";
import { getArchivePage, isTermSlug } from "@/lib/posts";

export async function generateStaticParams() {
  // Later archive pages render on first request. Cache Components requires
  // at least one param; this one can never exist and renders not-found.
  return [{ slug: "__none__", page: "2" }];
}

export async function generateMetadata(
  props: PageProps<"/category/[slug]/page/[page]">,
): Promise<Metadata> {
  const { slug, page } = await props.params;
  return archiveMetadata("category", slug, parsePageParam(page));
}

export default function CategoryArchivePage(props: PageProps<"/category/[slug]/page/[page]">) {
  return (
    <ArchiveFrame>
      <Suspense fallback={<ArchiveSkeleton />}>
        <CategoryArchive params={props.params} />
      </Suspense>
    </ArchiveFrame>
  );
}

async function CategoryArchive({ params }: { params: PageProps<"/category/[slug]/page/[page]">["params"] }) {
  const { slug, page: rawPage } = await params;
  const pageNumber = parsePageParam(rawPage);

  // Only redirect well-formed slugs; anything else falls through to not-found.
  if (pageNumber === 1 && isTermSlug("category", slug)) redirect(archivePath("category", slug));
  if (pageNumber === null) notFound();

  const archive = await getArchivePage("category", slug, pageNumber);
  if (!archive) notFound();

  return <ArchiveView archive={archive} />;
}
