import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ArticleBody } from "@/components/article/article-body";
import { ShareLinks } from "@/components/article/share-links";
import { TableOfContents, TOC_MIN_HEADINGS } from "@/components/article/table-of-contents";
import { PostEngagement } from "@/components/engagement/post-engagement";
import { FeedHeading } from "@/components/posts/feed-heading";
import { PostCover } from "@/components/posts/post-cover";
import { PostFeed } from "@/components/posts/post-feed";
import { PostMeta } from "@/components/posts/post-meta";
import { siteConfig } from "@/config/site";
import { archivePath } from "@/lib/archives";
import { formatTagName } from "@/lib/format";
import { extractHeadings } from "@/lib/headings";
import {
  getAdjacentPosts,
  getPublishedPostBySlug,
  getPublishedSlugs,
  getRelatedPosts,
} from "@/lib/posts";
import { canonicalAlternates } from "@/lib/site-url";
import type { PostSummary } from "@/types/post";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  // Cache Components requires at least one param. Before anything is
  // published, prerender a slug that can never exist (slugs cannot contain
  // underscores), which renders the not-found page.
  if (slugs.length === 0) return [{ slug: "__none__" }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: canonicalAlternates(`/blog/${post.slug}`),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
    },
  };
}

type ArticleParams = PageProps<"/blog/[slug]">["params"];

/** Related articles shown under an article. */
const RELATED_LIMIT = 3;

/*
 * The page itself renders only URL-independent UI so client navigations can
 * show it instantly. Everything that depends on the slug lives inside
 * <Suspense>; slugs from generateStaticParams are still fully prerendered.
 */
export default function ArticlePage(props: PageProps<"/blog/[slug]">) {
  return (
    <div className="px-5 pt-10 sm:px-8 sm:pt-14">
      <div aria-hidden="true" className="reading-progress" />
      <div className="mx-auto max-w-[42rem]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-ink-soft transition-colors hover:text-ink hover:underline hover:decoration-orange hover:decoration-2 hover:underline-offset-4"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All writing
        </Link>
      </div>

      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleContent params={props.params} />
      </Suspense>
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div role="status" aria-label="Loading article" className="mx-auto mt-10 max-w-[42rem] sm:mt-14">
      <div className="space-y-4 motion-safe:animate-pulse">
        <div className="h-3 w-24 rounded bg-rule" />
        <div className="h-10 w-full rounded bg-rule sm:h-14" />
        <div className="h-10 w-3/4 rounded bg-rule sm:h-14" />
        <div className="h-6 w-full rounded bg-rule" />
        <div className="mt-10 aspect-[16/9] rounded-2xl bg-rule sm:rounded-3xl" />
      </div>
    </div>
  );
}

async function ArticleContent({ params }: { params: ArticleParams }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const [{ newer, older }, related] = await Promise.all([
    getAdjacentPosts(post.slug),
    getRelatedPosts(post.slug, RELATED_LIMIT),
  ]);
  const headings = extractHeadings(post.contentMarkdown);

  return (
    <>
      <article>
        <div className="mx-auto max-w-[42rem]">
          <header className="mt-10 sm:mt-14">
            {post.category && (
              <p>
                <Link
                  href={archivePath("category", post.category.slug)}
                  className="inline-block -rotate-2 rounded-full border-2 border-edge bg-orange px-3 py-1 text-xs font-bold tracking-[0.08em] text-on-orange uppercase transition-transform hover:rotate-0"
                >
                  {post.category.name}
                </Link>
              </p>
            )}
            <h1 className="mt-5 font-serif text-[2.5rem] leading-[1.05] font-bold tracking-[-0.025em] text-balance text-ink sm:text-[3.6rem]">
              {post.title}
            </h1>
            <p className="mt-5 font-serif text-xl leading-relaxed text-pretty text-ink-soft italic sm:text-[1.4rem]">
              {post.excerpt}
            </p>
            <div className="mt-7 flex flex-col gap-1 border-y-2 border-dashed border-rule-strong py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ink-soft">By {siteConfig.authorLabel}</p>
              <PostMeta publishedAt={post.publishedAt} readingTimeMinutes={post.readingTimeMinutes} />
            </div>
          </header>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <PostCover
            slug={post.slug}
            image={post.coverImage}
            aspectClass="aspect-[16/9]"
            roundedClass="rounded-2xl sm:rounded-3xl"
            sizes="(min-width: 896px) 896px, 100vw"
            priority
          />
        </div>

        <div className="mx-auto mt-12 max-w-[42rem] xl:grid xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_42rem_minmax(0,1fr)] xl:gap-10">
          {headings.length >= TOC_MIN_HEADINGS && (
            <aside className="mb-10 xl:col-start-1 xl:mb-0">
              <TableOfContents headings={headings} />
            </aside>
          )}
          <div className="xl:col-start-2 xl:row-start-1">
            <ArticleBody markdown={post.contentMarkdown} />

            {post.tags.length > 0 && (
              <ul aria-label="Tags" className="mt-14 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={archivePath("tag", tag.slug)}
                      className="block rounded-full border-2 border-edge bg-paper-raised px-3 py-1 text-sm font-semibold text-ink-soft transition-colors hover:bg-peach hover:text-ink"
                    >
                      {formatTagName(tag.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <ShareLinks path={`/blog/${post.slug}`} title={post.title} />

            <PostEngagement postId={post.id} />
          </div>
        </div>

        {(newer || older) && (
          <nav aria-label="More writing" className="mx-auto mt-16 max-w-4xl border-t-2 border-dashed border-rule-strong pt-10">
            <ul className="grid gap-4 sm:grid-cols-2">
              <li>{older && <AdjacentLink post={older} direction="older" />}</li>
              <li>{newer && <AdjacentLink post={newer} direction="newer" />}</li>
            </ul>
          </nav>
        )}
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-16 max-w-6xl">
          <FeedHeading id="related-heading">Related writing</FeedHeading>
          <PostFeed posts={related} tiered={false} />
        </section>
      )}
    </>
  );
}

function AdjacentLink({ post, direction }: { post: PostSummary; direction: "older" | "newer" }) {
  const isNewer = direction === "newer";
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group sticker sticker-hover flex h-full flex-col gap-2 rounded-2xl bg-paper-raised p-5 ${
        isNewer ? "sm:items-end sm:text-right" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] text-accent uppercase">
        {!isNewer && <ArrowLeft aria-hidden="true" className="size-3.5" />}
        {isNewer ? "Newer" : "Older"}
        {isNewer && <ArrowRight aria-hidden="true" className="size-3.5" />}
      </span>
      <span className="font-serif text-xl leading-snug font-semibold text-balance text-ink decoration-orange decoration-2 underline-offset-4 group-hover:underline">
        {post.title}
      </span>
    </Link>
  );
}
