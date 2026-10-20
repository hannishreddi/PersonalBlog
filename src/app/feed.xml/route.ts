import { siteConfig } from "@/config/site";
import { getRecentPosts } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";

/** Items in the feed; readers only need recent posts. */
const FEED_ITEMS = 20;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * RSS 2.0 feed of the newest published posts (title, excerpt, link). Full
 * article bodies are not included. Links use SITE_URL when configured and
 * otherwise the request's own origin.
 */
export async function GET(request: Request) {
  const origin = (getSiteUrl() ?? new URL(request.url)).origin;
  const posts = await getRecentPosts(FEED_ITEMS);
  const absolute = (path: string) => new URL(path, origin).toString();

  const items = posts
    .map((post) => {
      const link = absolute(`/blog/${post.slug}`);
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        post.category ? `      <category>${escapeXml(post.category.name)}</category>` : null,
        `      <description>${escapeXml(post.excerpt)}</description>`,
        "    </item>",
      ]
        .filter((line) => line !== null)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(absolute("/"))}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(absolute("/feed.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
