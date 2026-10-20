import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FeedHeading } from "@/components/posts/feed-heading";
import { Pagination } from "@/components/posts/pagination";
import { PostFeed } from "@/components/posts/post-feed";
import { siteConfig } from "@/config/site";
import { archivePath, archiveTitle } from "@/lib/archives";
import type { ArchivePage } from "@/lib/posts";

const KIND_LABEL = { category: "Category", tag: "Tag" } as const;

function articleCount(count: number): string {
  return `${count} published ${count === 1 ? "article" : "articles"}`;
}

/*
 * Archive routes render ArchiveFrame (URL-independent) immediately and stream
 * ArchiveView inside <Suspense> so client navigations can show the frame
 * instantly. Slugs from generateStaticParams are still fully prerendered.
 */

/** Page container and back link shared by every category and tag archive. */
export function ArchiveFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink hover:underline hover:decoration-orange hover:decoration-2 hover:underline-offset-4"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All writing
      </Link>
      {children}
    </div>
  );
}

export function ArchiveSkeleton() {
  return (
    <div role="status" aria-label="Loading archive" className="mt-10 mb-12 sm:mt-14">
      <div className="space-y-4 motion-safe:animate-pulse">
        <div className="h-6 w-24 rounded-full bg-rule" />
        <div className="h-10 w-64 max-w-full rounded bg-rule sm:h-12" />
        <div className="h-5 w-40 rounded bg-rule" />
      </div>
    </div>
  );
}

/** A category or tag archive: heading, count, compact feed, pagination. */
export function ArchiveView({ archive }: { archive: ArchivePage }) {
  const { kind, term, page, totalPages, totalPosts } = archive;

  return (
    <>
      <header className="mt-10 mb-12 sm:mt-14">
        <p aria-hidden="true" className="inline-block -rotate-2 rounded-full border-2 border-edge bg-orange px-3 py-1 text-xs font-bold tracking-[0.08em] text-on-orange uppercase">
          {KIND_LABEL[kind]}
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-[-0.03em] text-balance text-ink sm:text-5xl">
          {/* Screen readers get "Category: Essays"; the visible label sits above. */}
          <span className="sr-only">{archiveTitle(kind, term.name)}</span>
          <span aria-hidden="true">{term.name}</span>
        </h1>
        <p className="mt-4 text-ink-soft">{articleCount(totalPosts)}</p>
      </header>

      <section aria-labelledby="feed-heading">
        <FeedHeading id="feed-heading">
          {totalPages > 1 ? `Page ${page} of ${totalPages}` : "Newest first"}
        </FeedHeading>
        <PostFeed
          posts={archive.posts}
          tiered={false}
          startIndex={(page - 1) * siteConfig.postsPerPage}
        />
        <Pagination page={page} totalPages={totalPages} basePath={archivePath(kind, term.slug)} />
      </section>
    </>
  );
}
