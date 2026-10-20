import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FeedHeading } from "@/components/posts/feed-heading";
import { Pagination } from "@/components/posts/pagination";
import { PostFeed } from "@/components/posts/post-feed";
import { siteConfig } from "@/config/site";
import { getPublishedPageCount, getPublishedPostPage } from "@/lib/posts";

export async function generateStaticParams() {
  const count = await getPublishedPageCount();
  // Page 1 lives at "/". Cache Components requires at least one param,
  // so a single-page archive still lists page 2, which then 404s.
  const pages = Array.from({ length: Math.max(1, count - 1) }, (_, i) => String(i + 2));
  return pages.map((page) => ({ page }));
}

function parsePage(raw: string): number | null {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata(props: PageProps<"/page/[page]">): Promise<Metadata> {
  const { page } = await props.params;
  return { title: `Older writing, page ${page}` };
}

export default function ArchivePage(props: PageProps<"/page/[page]">) {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
      <h1 className="mb-12 font-serif text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
        Older writing
      </h1>
      <Suspense fallback={<p className="text-ink-muted" role="status">Loading posts…</p>}>
        <ArchiveFeed params={props.params} />
      </Suspense>
    </div>
  );
}

async function ArchiveFeed({ params }: { params: PageProps<"/page/[page]">["params"] }) {
  const { page: rawPage } = await params;
  const pageNumber = parsePage(rawPage);

  if (pageNumber === 1) redirect("/");
  if (pageNumber === null) notFound();

  const page = await getPublishedPostPage(pageNumber);
  if (!page) notFound();

  return (
    <section aria-labelledby="feed-heading">
      <FeedHeading id="feed-heading">
        Page {page.page} of {page.totalPages}
      </FeedHeading>
      <PostFeed
        posts={page.posts}
        tiered={false}
        startIndex={(page.page - 1) * siteConfig.postsPerPage}
      />
      <Pagination page={page.page} totalPages={page.totalPages} />
    </section>
  );
}
