import type { Metadata } from "next";

import { FeedHeading } from "@/components/posts/feed-heading";
import { TopicChips } from "@/components/posts/topic-chips";
import { getTopics } from "@/lib/posts";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Topics",
  description: "Every category and tag with published writing.",
  alternates: canonicalAlternates("/topics"),
};

export default async function TopicsPage() {
  const { categories, tags } = await getTopics();
  const empty = categories.length === 0 && tags.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
      <header className="mb-14 max-w-2xl">
        <p className="-rotate-2 font-hand text-2xl text-accent">wander around</p>
        <h1 className="mt-2 font-serif text-5xl font-bold tracking-[-0.03em] text-ink sm:text-6xl">Topics</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Every category and tag with published writing, most used first.
        </p>
      </header>

      {empty ? (
        <p className="rounded-3xl border-2 border-dashed border-rule-strong px-6 py-16 text-center font-hand text-2xl text-ink-soft">
          No topics yet. They&rsquo;ll appear once writing is published.
        </p>
      ) : (
        <div className="flex flex-col gap-16">
          {categories.length > 0 && (
            <section aria-labelledby="categories-heading">
              <FeedHeading id="categories-heading">Categories</FeedHeading>
              <TopicChips kind="category" topics={categories} />
            </section>
          )}
          {tags.length > 0 && (
            <section aria-labelledby="tags-heading">
              <FeedHeading id="tags-heading">Tags</FeedHeading>
              <TopicChips kind="tag" topics={tags} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
