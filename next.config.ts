import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Only published-post images from the /media route may be optimized.
    // Owner previews (/admin/images) bypass the optimizer on purpose.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    // The optimizer cache can't be invalidated, so keep it short: an image
    // stops being served within about 5 minutes of its post being unpublished.
    minimumCacheTTL: 300,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
