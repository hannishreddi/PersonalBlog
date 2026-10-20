import { ImageResponse } from "next/og";

import { OG_OPTIONS, OG_SIZE, OgCard } from "@/components/og/og-card";
import { siteConfig } from "@/config/site";
import { getSiteUrl } from "@/lib/site-url";

/** The default link preview for every page without its own image. */
export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard eyebrow="Personal essays" title={siteConfig.tagline} siteName={siteConfig.name} host={getSiteUrl()?.host} />,
    OG_OPTIONS,
  );
}
