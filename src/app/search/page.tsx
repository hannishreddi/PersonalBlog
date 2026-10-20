import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { z } from "zod";

import { FeedHeading } from "@/components/posts/feed-heading";
import { PostFeed } from "@/components/posts/post-feed";
import { SEARCH_QUERY_MAX, SEARCH_RESULT_LIMIT, searchPublishedPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Search",
  description: "Search published writing.",
  // Result pages are endless query variations; keep them out of search engines.
  robots: { index: false, follow: true },
};

const querySchema = z.string().trim().max(SEARCH_QUERY_MAX);

/** The `q` parameter, trimmed; null when missing or too long. */
function parseQuery(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const result = querySchema.safeParse(value ?? "");
  return result.success ? result.data : null;
}

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 sm:pt-20">
      <header className="max-w-2xl">
        <p className="-rotate-2 font-hand text-2xl text-accent">looking for something?</p>
        <h1 className="mt-2 font-serif text-5xl font-bold tracking-[-0.03em] text-ink sm:text-6xl">Search</h1>
      </header>

      {/* The query lives in the URL, so the form and results render at request time. */}
      <Suspense fallback={<SearchForm defaultValue="" />}>
        <SearchContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <form action="/search" method="get" role="search" className="mt-8 max-w-2xl">
      <label htmlFor="search-query" className="sr-only">
        Search published writing
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="search-query"
          name="q"
          type="search"
          defaultValue={defaultValue}
          maxLength={SEARCH_QUERY_MAX}
          placeholder="Try a word, a phrase in “quotes”, or -exclude"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "search-error" : undefined}
          className="sticker min-w-0 flex-1 rounded-full bg-paper-raised px-5 py-3 text-base text-ink placeholder:text-ink-muted"
        />
        <button type="submit" className="btn btn-primary sticker sticker-hover py-3!">
          <Search aria-hidden="true" className="size-4" />
          Search
        </button>
      </div>
      {error && (
        <p id="search-error" role="alert" className="mt-3 text-sm font-semibold text-accent">
          {error}
        </p>
      )}
    </form>
  );
}

async function SearchContent({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const query = parseQuery((await searchParams).q);

  if (query === null) {
    return <SearchForm defaultValue="" error={`Searches can be up to ${SEARCH_QUERY_MAX} characters long.`} />;
  }

  if (query === "") return <SearchForm defaultValue="" />;

  const posts = await searchPublishedPosts(query);

  return (
    <>
      <SearchForm defaultValue={query} />
      <section aria-labelledby="results-heading" className="mt-14">
        <FeedHeading id="results-heading">
          {posts.length === 0
            ? "No matches"
            : `${posts.length}${posts.length === SEARCH_RESULT_LIMIT ? "+" : ""} ${posts.length === 1 ? "result" : "results"}`}
        </FeedHeading>
        <p role="status" className="sr-only">
          {posts.length === 0 ? `No posts match “${query}”.` : `${posts.length} posts match “${query}”.`}
        </p>

        {posts.length > 0 ? (
          <>
            <PostFeed posts={posts} tiered={false} />
            {posts.length === SEARCH_RESULT_LIMIT && (
              <p className="mt-8 text-ink-soft">
                Showing the {SEARCH_RESULT_LIMIT} newest matches. Try a more specific search to narrow them down.
              </p>
            )}
          </>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-rule-strong px-6 py-14 text-center">
            <p className="font-hand text-2xl text-ink-soft">Nothing matches “{query}” (yet!).</p>
            <p className="mt-3 text-ink-soft">
              Try different words, or{" "}
              <Link href="/topics" className="font-semibold text-ink underline decoration-orange decoration-2 underline-offset-4">
                browse by topic
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </>
  );
}
