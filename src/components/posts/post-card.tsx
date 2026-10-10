import Link from "next/link";

import { PostCover } from "@/components/posts/post-cover";
import { PostMeta } from "@/components/posts/post-meta";
import type { PostSummary } from "@/types/post";

export type CardTier = "large" | "medium" | "compact";

interface TierStyle {
  card: string;
  cover: string;
  radius: string;
  coverRadius: string;
  title: string;
  excerpt: string | null;
  sizes: string;
}

const TIER_STYLES: Record<CardTier, TierStyle> = {
  large: {
    card: "gap-5 p-3 pb-6",
    cover: "aspect-[4/3]",
    radius: "rounded-3xl",
    coverRadius: "rounded-[1.1rem]",
    title: "text-[1.7rem] leading-[1.15] sm:text-3xl",
    excerpt: "text-[1.02rem] leading-relaxed",
    sizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  },
  medium: {
    card: "gap-4 p-3 pb-5",
    cover: "aspect-[16/10]",
    radius: "rounded-2xl",
    coverRadius: "rounded-xl",
    title: "text-2xl leading-tight",
    excerpt: "text-[0.97rem] leading-relaxed line-clamp-3",
    sizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  },
  compact: {
    card: "gap-3 p-2.5 pb-4",
    cover: "aspect-[2/1]",
    radius: "rounded-xl",
    coverRadius: "rounded-lg",
    title: "text-xl leading-snug",
    excerpt: null,
    sizes: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  },
};

interface PostCardProps {
  post: PostSummary;
  tier: CardTier;
  /**
   * When the last card of a tier sits alone in the two-column tablet grid,
   * it spans both columns and switches to a side-by-side layout so the
   * cover keeps the tier's aspect ratio instead of becoming oversized.
   */
  wideOnTablet?: boolean;
  priority?: boolean;
}

export function PostCard({ post, tier, wideOnTablet = false, priority = false }: PostCardProps) {
  const style = TIER_STYLES[tier];

  return (
    <article
      className={`group relative flex h-full flex-col border border-rule bg-paper-raised transition-colors duration-200 hover:border-rule-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-focus ${style.card} ${style.radius} ${
        wideOnTablet ? "md:max-lg:flex-row md:max-lg:items-center md:max-lg:pb-3" : ""
      }`}
    >
      <div className={wideOnTablet ? "md:max-lg:w-1/2 md:max-lg:shrink-0" : ""}>
        <PostCover
          slug={post.slug}
          image={post.coverImage}
          aspectClass={style.cover}
          roundedClass={style.coverRadius}
          sizes={style.sizes}
          priority={priority}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-2">
        {post.category && (
          <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">
            {post.category.name}
          </p>
        )}

        <h3 className={`font-serif font-medium tracking-[-0.01em] text-balance text-ink ${style.title}`}>
          {/* The ::after pseudo-element stretches the link over the whole card. */}
          <Link
            href={`/blog/${post.slug}`}
            className="decoration-accent/60 decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </h3>

        {style.excerpt && (
          <p className={`text-pretty text-ink-soft ${style.excerpt}`}>{post.excerpt}</p>
        )}

        <PostMeta
          publishedAt={post.publishedAt}
          readingTimeMinutes={post.readingTimeMinutes}
          className="mt-auto pt-1"
        />
      </div>
    </article>
  );
}
