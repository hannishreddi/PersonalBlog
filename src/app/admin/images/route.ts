import type { NextRequest } from "next/server";
import { z } from "zod";

import { getViewerStatus } from "@/lib/auth";
import { sniffImage, withinDimensionLimit } from "@/lib/image-validation";
import {
  ACCEPTED_EXTENSIONS,
  IMAGE_BUCKET,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  adminMediaUrl,
  formatBytes,
  mediaUrl,
  type ImageKind,
} from "@/lib/images";
import { createSessionClient } from "@/lib/supabase/server";

/*
 * POST /admin/images: owner-only image upload (multipart form: `file`,
 * `kind` = "cover" | "inline", optional `width`/`height` as displayed by the
 * browser).
 *
 * This is a public endpoint like any other: it checks the request origin,
 * then the owner session, then validates the file by its bytes. The upload
 * itself runs with the owner's session, so storage RLS checks ownership
 * again. The new object gets a random, never-reused name (upsert: false), so
 * an upload can never overwrite another file. Nothing is attached to a post
 * here: the editor puts the returned path into the post, and saving the post
 * makes it referenced.
 */

const JSON_HEADERS = { "Cache-Control": "no-store" };

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: JSON_HEADERS });
}

/** Same rule Server Actions use: the Origin header must match the host. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const fieldsSchema = z.object({
  kind: z.enum(["cover", "inline"]),
  width: z.coerce.number().int().min(1).max(MAX_IMAGE_DIMENSION).nullable(),
  height: z.coerce.number().int().min(1).max(MAX_IMAGE_DIMENSION).nullable(),
});

const ACCEPTED_LIST = "JPEG, PNG, WebP, AVIF, or GIF";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail(403, "Upload rejected: it didn’t come from this site.");

  let viewer: Awaited<ReturnType<typeof getViewerStatus>>;
  try {
    viewer = await getViewerStatus();
  } catch {
    return fail(500, "Couldn’t verify your session. Please try again.");
  }
  if (viewer.kind === "anonymous") return fail(401, "Your session has expired. Sign in again to upload.");
  if (viewer.kind === "not-owner") return fail(403, "Only the blog owner can upload images.");

  // Reject oversized bodies before reading them (allowing for form overhead).
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_IMAGE_BYTES + 64 * 1024) {
    return fail(413, `Images can be at most ${formatBytes(MAX_IMAGE_BYTES)}.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "The upload was incomplete. Please try again.");
  }

  const file = form.get("file");
  const fields = fieldsSchema.safeParse({
    kind: form.get("kind"),
    width: form.get("width") || null,
    height: form.get("height") || null,
  });
  if (!(file instanceof File) || !fields.success) return fail(400, "The upload was malformed. Please try again.");

  if (file.size === 0) return fail(400, "That file is empty.");
  if (file.size > MAX_IMAGE_BYTES) {
    return fail(413, `“${file.name}” is ${formatBytes(file.size)}. Images can be at most ${formatBytes(MAX_IMAGE_BYTES)}.`);
  }

  // The browser's name and type are only cross-checked, never trusted.
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const extensionType = ACCEPTED_EXTENSIONS[extension];
  if (!extensionType) {
    return fail(415, `“${file.name}” isn’t a supported image. Use ${ACCEPTED_LIST} (SVG isn’t allowed).`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return fail(413, `Images can be at most ${formatBytes(MAX_IMAGE_BYTES)}.`);
  }
  const image = sniffImage(bytes);
  if (!image) {
    return fail(415, `“${file.name}” isn’t a valid ${ACCEPTED_LIST} image, or the file is damaged.`);
  }
  if (image.type !== extensionType || (file.type && file.type !== image.type)) {
    return fail(415, `“${file.name}” doesn’t contain the kind of image its name says. Re-export it and try again.`);
  }
  if (!withinDimensionLimit(image)) {
    return fail(
      413,
      `“${file.name}” is ${image.width}×${image.height} pixels. Resize it to at most ${MAX_IMAGE_DIMENSION.toLocaleString("en")} pixels per side.`,
    );
  }

  // JPEGs with an EXIF rotation display with width and height swapped; the
  // browser reports the displayed size. Accept that, and nothing else.
  let { width, height } = image;
  const { width: shownWidth, height: shownHeight } = fields.data;
  if (image.type === "image/jpeg" && shownWidth === height && shownHeight === width) {
    [width, height] = [shownWidth, shownHeight];
  }

  const kind: ImageKind = fields.data.kind === "cover" ? "covers" : "inline";
  const path = `${kind}/${crypto.randomUUID()}-${width}x${height}.${IMAGE_TYPES[image.type]}`;

  const supabase = await createSessionClient();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, bytes, {
    contentType: image.type,
    upsert: false,
  });
  if (error) return fail(502, "The image couldn’t be stored. Please try again.");

  return Response.json(
    { path, width, height, url: mediaUrl(path), previewUrl: adminMediaUrl(path) },
    { status: 201, headers: JSON_HEADERS },
  );
}
