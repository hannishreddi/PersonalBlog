import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ArticleBody } from "@/components/article/article-body";
import { PostEngagement } from "@/components/engagement/post-engagement";
import { PostCover } from "@/components/posts/post-cover";
import { PostMeta } from "@/components/posts/post-meta";
import { siteConfig } from "@/config/site";
import { getAdjacentPosts, getPublishedPostBySlug, getPublishedSlugs } from "@/lib/posts";
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
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
    },
  };
}

type ArticleParams = PageProps<"/blog/[slug]">["params"];

/*
 * The page itself renders only URL-independent UI so client navigations can
 * show it instantly. Everything that depends on the slug lives inside
 * <Suspense>; slugs from generateStaticParams are still fully prerendered.
 */
export default function ArticlePage(props: PageProps<"/blog/[slug]">) {
  return (
    <div className="px-5 pt-10 sm:px-8 sm:pt-14">
      <div className="mx-auto max-w-[42rem]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
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

  const { newer, older } = await getAdjacentPosts(post.slug);

  return (
    <article>
      <div className="mx-auto max-w-[42rem]">
        <header className="mt-10 sm:mt-14">
          {post.category && (
            <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">
              {post.category.name}
            </p>
          )}
          <h1 className="mt-4 font-serif text-[2.4rem] leading-[1.08] font-normal tracking-[-0.02em] text-balance text-ink sm:text-[3.4rem]">
            {post.title}
          </h1>
          <p className="mt-5 font-serif text-xl leading-relaxed text-pretty text-ink-soft italic sm:text-[1.4rem]">
            {post.excerpt}
          </p>
          <div className="mt-7 flex flex-col gap-1 border-y border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">By {siteConfig.authorLabel}</p>
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

      <div className="mx-auto mt-12 max-w-[42rem]">
        <ArticleBody markdown={post.contentMarkdown} />

        {post.tags.length > 0 && (
          <ul aria-label="Tags" className="mt-14 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-rule px-3 py-1 text-xs tracking-wide text-ink-muted"
              >
                #{tag}
              </li>
            ))}
          </ul>
        )}

        <PostEngagement postId={post.id} />
      </div>

      {(newer || older) && (
        <nav aria-label="More writing" className="mx-auto mt-16 max-w-4xl border-t border-rule pt-10">
          <ul className="grid gap-4 sm:grid-cols-2">
            <li>{older && <AdjacentLink post={older} direction="older" />}</li>
            <li>{newer && <AdjacentLink post={newer} direction="newer" />}</li>
          </ul>
        </nav>
      )}
    </article>
  );
}

function AdjacentLink({ post, direction }: { post: PostSummary; direction: "older" | "newer" }) {
  const isNewer = direction === "newer";
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex h-full flex-col gap-2 rounded-2xl border border-rule bg-paper-raised p-5 transition-colors hover:border-rule-strong ${
        isNewer ? "sm:items-end sm:text-right" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
        {!isNewer && <ArrowLeft aria-hidden="true" className="size-3.5" />}
        {isNewer ? "Newer" : "Older"}
        {isNewer && <ArrowRight aria-hidden="true" className="size-3.5" />}
      </span>
      <span className="font-serif text-xl leading-snug text-balance text-ink decoration-accent/60 underline-offset-4 group-hover:underline">
        {post.title}
      </span>
    </Link>
  );
}
