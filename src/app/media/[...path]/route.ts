import type { NextRequest } from "next/server";

import { IMAGE_BUCKET, parseImagePath } from "@/lib/images";
import { createPublicClient } from "@/lib/supabase/public";

/*
 * GET /media/<path>: public delivery for images of published posts.
 *
 * The bucket is private. This handler downloads with the cookie-less anon
 * client, so storage RLS decides: the only anon read policy allows objects
 * referenced (in post_images) by a post that is published and whose
 * published_at has passed. Draft, archived, scheduled, and unreferenced
 * images get a 404 indistinguishable from a missing file. No privileged key
 * is involved, and the owner's session is never used here, so responses are
 * the same for everyone and safe to cache publicly.
 *
 * Cache lifetime is short (5 minutes, the same order as the posts data
 * cache, and matched by images.minimumCacheTTL), so an image stops being
 * served soon after its post is unpublished. Object names are random and
 * never reused, so a cached copy can never show a different image.
 */

const MAX_AGE_SECONDS = 300;

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const image = parseImagePath(path.join("/"));
  if (!image) return notFound();

  const { data, error } = await createPublicClient().storage.from(IMAGE_BUCKET).download(image.path);
  if (error || !data) return notFound();

  return new Response(data.stream(), {
    headers: {
      // The type comes from the validated extension, never stored metadata.
      "Content-Type": image.contentType,
      "Content-Length": String(data.size),
      "Cache-Control": `public, max-age=${MAX_AGE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
