import { notFound } from "next/navigation";

import { FeedHeading } from "@/components/posts/feed-heading";
import { Pagination } from "@/components/posts/pagination";
import { PostFeed } from "@/components/posts/post-feed";
import { siteConfig } from "@/config/site";
import { getPublishedPostPage } from "@/lib/posts";

export default async function HomePage() {
  const page = await getPublishedPostPage(1);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section aria-labelledby="intro-heading" className="py-14 sm:py-20 lg:py-24">
        <h1
          id="intro-heading"
          className="max-w-3xl font-serif text-[2.6rem] leading-[1.05] font-normal tracking-[-0.02em] text-balance text-ink sm:text-6xl"
        >
          {siteConfig.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-ink-soft">
          A short introduction to this publication will live here: who writes it, and what readers
          can expect. <span className="text-ink-muted">(Placeholder copy.)</span>
        </p>
      </section>

      <section aria-labelledby="feed-heading">
        <FeedHeading id="feed-heading">Latest writing</FeedHeading>
        {page.posts.length > 0 ? (
          <PostFeed posts={page.posts} />
        ) : (
          <p className="rounded-2xl border border-dashed border-rule-strong px-6 py-16 text-center text-ink-muted">
            Nothing has been published yet. New writing will appear here.
          </p>
        )}
        <Pagination page={page.page} totalPages={page.totalPages} />
      </section>
    </div>
  );
}
