import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
 * Content Security Policy without nonces: nonces need every page rendered
 * per request, which would give up the prerendered shells this site relies
 * on (cacheComponents). Inline scripts are therefore allowed (Next.js's own
 * bootstrap and the theme script); everything else is limited to this
 * origin. Nothing loads from third parties: fonts are self-hosted by
 * next/font, images come from /media and /_next/image, and uploads go to
 * /admin/images. React's dev tooling needs 'unsafe-eval' in development only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // HTTPS-only for two years once served over TLS; browsers ignore it on plain http://localhost.
  // Not applied to subdomains, which this app doesn't control.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]),
];

const nextConfig: NextConfig = {
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
