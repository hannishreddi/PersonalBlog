import type { NextRequest } from "next/server";

import { getViewerStatus } from "@/lib/auth";
import { IMAGE_BUCKET, parseImagePath } from "@/lib/images";
import { createSessionClient } from "@/lib/supabase/server";

/*
 * GET /admin/images/<path>: lets the owner see any image in the bucket,
 * including ones only used by drafts, in the editor preview. Responses are
 * private and never stored, and the editor renders them with a plain <img>,
 * not the shared image optimizer, so a draft image can't end up in a cache
 * that readers can hit. Readers get images from /media instead.
 */

const NO_STORE = { "Cache-Control": "private, no-store" };

function notFound() {
  return new Response("Not found", { status: 404, headers: NO_STORE });
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/images/[...path]">) {
  let viewer: Awaited<ReturnType<typeof getViewerStatus>>;
  try {
    viewer = await getViewerStatus();
  } catch {
    return new Response("Unavailable", { status: 503, headers: NO_STORE });
  }
  // Same answer for every non-owner, so nothing about the bucket is revealed.
  if (viewer.kind !== "owner") return notFound();

  const { path } = await ctx.params;
  const image = parseImagePath(path.join("/"));
  if (!image) return notFound();

  const supabase = await createSessionClient();
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(image.path);
  if (error || !data) return notFound();

  return new Response(data.stream(), {
    headers: {
      ...NO_STORE,
      "Content-Type": image.contentType,
      "Content-Length": String(data.size),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
