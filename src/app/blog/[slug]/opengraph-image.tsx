import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { OG_OPTIONS, OG_SIZE, OgCard } from "@/components/og/og-card";
import { siteConfig } from "@/config/site";
import { IMAGE_BUCKET, parseMediaUrl } from "@/lib/images";
import { getPublishedPostBySlug } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site-url";
import { createPublicClient } from "@/lib/supabase/public";
import type { CoverImage } from "@/types/post";

/*
 * Link preview for an article: its title and category on the site's card,
 * with the cover image beside them when there is one. Satori can only draw
 * JPEG and PNG, so other cover formats fall back to the text-only card.
 */

export const alt = `Article preview from ${siteConfig.name}`;
export const size = OG_SIZE;
export const contentType = "image/png";

const DRAWABLE_TYPES = new Set(["image/jpeg", "image/png"]);

/** The cover as a data URL, or undefined if it can't be drawn. */
async function coverDataUrl(cover: CoverImage | null): Promise<string | undefined> {
  const image = parseMediaUrl(cover?.src);
  if (!image || !DRAWABLE_TYPES.has(image.contentType)) return undefined;

  // The anon client is subject to the same storage RLS as /media: only
  // images of published posts can be read.
  const { data, error } = await createPublicClient().storage.from(IMAGE_BUCKET).download(image.path);
  if (error || !data) return undefined;
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${image.contentType};base64,${base64}`;
}

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  return new ImageResponse(
    <OgCard
      eyebrow={post.category?.name}
      title={post.title}
      siteName={siteConfig.name}
      host={getSiteUrl()?.host}
      image={await coverDataUrl(post.coverImage)}
    />,
    OG_OPTIONS,
  );
}
