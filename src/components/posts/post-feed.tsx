import { PostCard, type CardTier } from "@/components/posts/post-card";
import type { PostSummary } from "@/types/post";

interface Tier {
  tier: CardTier;
  posts: PostSummary[];
  /** 1-based position of the first post, so list numbering stays continuous. */
  start: number;
}

/**
 * Splits newest-first posts into visual tiers without reordering them:
 * posts 1–3 large, 4–6 medium, 7+ compact. When `tiered` is false
 * (later archive pages), every post uses the compact card.
 */
function toTiers(posts: PostSummary[], tiered: boolean): Tier[] {
  if (!tiered) return [{ tier: "compact", posts, start: 1 }];

  const tiers: Tier[] = [
    { tier: "large", posts: posts.slice(0, 3), start: 1 },
    { tier: "medium", posts: posts.slice(3, 6), start: 4 },
    { tier: "compact", posts: posts.slice(6), start: 7 },
  ];
  return tiers.filter((t) => t.posts.length > 0);
}

const TIER_GAP: Record<CardTier, string> = {
  large: "gap-6 lg:gap-7",
  medium: "gap-6",
  compact: "gap-5",
};

interface PostFeedProps {
  posts: PostSummary[];
  tiered?: boolean;
  /** Offset applied to list numbering on later pages. */
  startIndex?: number;
}

export function PostFeed({ posts, tiered = true, startIndex = 0 }: PostFeedProps) {
  const tiers = toTiers(posts, tiered);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {tiers.map(({ tier, posts: tierPosts, start }) => (
        // Each tier is its own ordered list, rendered in feed order, so
        // DOM order, tab order, and screen-reader order all match the
        // reverse-chronological feed at every breakpoint.
        <ol
          key={tier}
          start={startIndex + start}
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${TIER_GAP[tier]}`}
        >
          {tierPosts.map((post, i) => {
            const isLoneOnTablet = tierPosts.length % 2 === 1 && i === tierPosts.length - 1;
            return (
              <li key={post.id} className={isLoneOnTablet ? "md:max-lg:col-span-2" : undefined}>
                <PostCard
                  post={post}
                  tier={tier}
                  wideOnTablet={isLoneOnTablet}
                  priority={tiered && tier === "large" && i === 0}
                />
              </li>
            );
          })}
        </ol>
      ))}
    </div>
  );
}
