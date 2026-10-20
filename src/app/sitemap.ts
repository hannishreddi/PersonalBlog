import type { MetadataRoute } from "next";

import { archivePath } from "@/lib/archives";
import { getSitemapPosts, getTopics } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Public, published URLs only: drafts, archived and scheduled posts never
 * reach these queries (RLS plus explicit filters in lib/posts). Sitemaps need
 * absolute URLs, so this stays empty until SITE_URL is configured.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  if (!site) return [];

  const [posts, topics] = await Promise.all([getSitemapPosts(), getTopics()]);
  const url = (path: string) => new URL(path, site).toString();

  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/topics"), changeFrequency: "weekly", priority: 0.5 },
    ...posts.map((post) => ({
      url: url(`/blog/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...topics.categories.map((c) => ({ url: url(archivePath("category", c.slug)), priority: 0.4 })),
    ...topics.tags.map((t) => ({ url: url(archivePath("tag", t.slug)), priority: 0.3 })),
  ];
}
