import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArchiveFrame, ArchiveSkeleton, ArchiveView } from "@/components/posts/archive-view";
import { archiveMetadata } from "@/lib/archives";
import { getArchivePage, getArchiveSlugs } from "@/lib/posts";

export async function generateStaticParams() {
  const slugs = await getArchiveSlugs("category");
  // Cache Components requires at least one param. Slugs cannot contain
  // underscores, so this one always renders the not-found page.
  if (slugs.length === 0) return [{ slug: "__none__" }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return archiveMetadata("category", slug, 1);
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <ArchiveFrame>
      <Suspense fallback={<ArchiveSkeleton />}>
        <CategoryArchive params={props.params} />
      </Suspense>
    </ArchiveFrame>
  );
}

async function CategoryArchive({ params }: { params: PageProps<"/category/[slug]">["params"] }) {
  const { slug } = await params;
  const archive = await getArchivePage("category", slug, 1);
  if (!archive) notFound();

  return <ArchiveView archive={archive} />;
}
