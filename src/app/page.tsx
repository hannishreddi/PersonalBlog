import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, Rss } from "lucide-react";

import { FeedHeading } from "@/components/posts/feed-heading";
import { Pagination } from "@/components/posts/pagination";
import { PostFeed } from "@/components/posts/post-feed";
import { TopicChips } from "@/components/posts/topic-chips";
import { siteConfig } from "@/config/site";
import { getPublishedPostPage, getTopics } from "@/lib/posts";

/** Categories shown under the intro; the rest live on /topics. */
const HOME_TOPIC_LIMIT = 8;

export default async function HomePage() {
  const [page, topics] = await Promise.all([getPublishedPostPage(1), getTopics()]);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section aria-labelledby="intro-heading" className="py-10 sm:py-14 lg:py-16">
        <div className="sticker relative overflow-hidden rounded-[2rem] bg-peach px-6 py-10 sm:px-10 sm:py-14 md:pr-48 lg:px-14 lg:py-16 lg:pr-64">
          <HeroDoodles />
          <p className="relative -rotate-2 font-hand text-2xl text-accent sm:text-[1.75rem]">hello there, reader!</p>
          <h1
            id="intro-heading"
            className="relative mt-3 max-w-3xl font-serif text-[2.7rem] leading-[1.02] font-bold tracking-[-0.03em] text-balance text-ink sm:text-6xl lg:text-7xl"
          >
            {siteConfig.tagline}
          </h1>
          <p className="relative mt-6 max-w-xl text-lg leading-relaxed text-pretty text-ink-soft">
            A short introduction to this publication will live here: who writes it, and what readers
            can expect. <span className="text-ink-muted">(Placeholder copy.)</span>
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <a href="#feed-heading" className="btn btn-primary sticker sticker-hover">
              Start reading
              <ArrowDown aria-hidden="true" className="size-4" />
            </a>
            <Link href="/about" className="btn btn-secondary sticker sticker-hover">
              About this blog
            </Link>
            <a href="/feed.xml" className="btn btn-secondary sticker sticker-hover">
              <Rss aria-hidden="true" className="size-4" />
              RSS
            </a>
          </div>
        </div>
      </section>

      {topics.categories.length > 0 && (
        <section aria-labelledby="topics-heading" className="mb-14">
          <h2 id="topics-heading" className="font-hand text-2xl text-ink-soft">
            or jump into a topic…
          </h2>
          <TopicChips
            className="mt-3"
            kind="category"
            topics={topics.categories.slice(0, HOME_TOPIC_LIMIT)}
            moreHref={topics.categories.length > HOME_TOPIC_LIMIT ? "/topics" : undefined}
          />
        </section>
      )}

      <section aria-labelledby="feed-heading" className="scroll-mt-6">
        <FeedHeading id="feed-heading">Latest writing</FeedHeading>
        {page.posts.length > 0 ? (
          <PostFeed posts={page.posts} />
        ) : (
          <p className="rounded-3xl border-2 border-dashed border-rule-strong px-6 py-16 text-center font-hand text-2xl text-ink-soft">
            Nothing has been published yet. New writing will appear here.
          </p>
        )}
        <Pagination page={page.page} totalPages={page.totalPages} />
      </section>
    </div>
  );
}

/** Decorative shapes in the hero corner; hidden on narrow screens. */
function HeroDoodles() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 220 220"
      className="pointer-events-none absolute -top-10 -right-10 hidden w-56 md:block lg:w-72"
    >
      <circle cx="120" cy="100" r="62" fill="var(--orange)" stroke="var(--edge)" strokeWidth="3" />
      <path
        d="M30 190 Q55 160 80 190 T130 190 T180 190"
        fill="none"
        stroke="var(--edge)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M28 110 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 z" fill="var(--edge)" />
      <circle cx="40" cy="60" r="8" fill="none" stroke="var(--edge)" strokeWidth="3" />
    </svg>
  );
}
