/**
 * Image paths and limits shared by the editor, the upload route, the media
 * routes, and the Markdown renderer. Safe to import from client code.
 *
 * Every uploaded object lives in the private `post-images` bucket at
 *   covers/<uuid>-<width>x<height>.<ext>   or   inline/<uuid>-<width>x<height>.<ext>
 * The random uuid prevents collisions and guessing; the dimensions let pages
 * reserve layout space without another lookup. Markdown and pages reference
 * images as `/media/<path>`. The database trigger `private.sync_post_images()`
 * matches exactly the same pattern (see supabase/migrations), so only images
 * in this format can ever become publicly readable.
 */

export const IMAGE_BUCKET = "post-images";

/** Mirrors the bucket's file_size_limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Largest accepted width or height, in pixels. */
export const MAX_IMAGE_DIMENSION = 10_000;

/** Longest accepted alt text; matches the cover_image_alt column limit. */
export const MAX_ALT_LENGTH = 300;

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type ImageMimeType = keyof typeof IMAGE_TYPES;
export type ImageExtension = (typeof IMAGE_TYPES)[ImageMimeType];
export type ImageKind = "covers" | "inline";

/** File-name extensions accepted from the owner's computer. */
export const ACCEPTED_EXTENSIONS: Record<string, ImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

/** For <input accept>. Excludes SVG on purpose: it can carry script. */
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_SOURCE = `(covers|inline)/${UUID}-([1-9][0-9]{0,4})x([1-9][0-9]{0,4})\\.(jpg|png|webp|avif|gif)`;
const PATH_PATTERN = new RegExp(`^${PATH_SOURCE}$`);

export const MEDIA_PREFIX = "/media/";
/** Owner-only preview route for images of unpublished posts. */
export const ADMIN_MEDIA_PREFIX = "/admin/images/";

export interface StoredImage {
  path: string;
  kind: ImageKind;
  width: number;
  height: number;
  extension: ImageExtension;
  contentType: ImageMimeType;
}

const EXTENSION_TYPES = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]),
) as Record<ImageExtension, ImageMimeType>;

/** Parses a storage path in the canonical format, or returns null. */
export function parseImagePath(path: string): StoredImage | null {
  const match = PATH_PATTERN.exec(path);
  if (!match) return null;
  const width = Number(match[2]);
  const height = Number(match[3]);
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) return null;
  const extension = match[4] as ImageExtension;
  return { path, kind: match[1] as ImageKind, width, height, extension, contentType: EXTENSION_TYPES[extension] };
}

/** `/media/<path>` → parsed image, for URLs found in Markdown. */
export function parseMediaUrl(src: string | undefined): StoredImage | null {
  if (!src?.startsWith(MEDIA_PREFIX)) return null;
  return parseImagePath(src.slice(MEDIA_PREFIX.length));
}

export function mediaUrl(path: string): string {
  return `${MEDIA_PREFIX}${path}`;
}

export function adminMediaUrl(path: string): string {
  return `${ADMIN_MEDIA_PREFIX}${path}`;
}

/**
 * Storage paths referenced by a post: its cover plus every `/media/<path>`
 * in the Markdown. Mirrors `private.post_image_refs()` in the database.
 */
export function referencedImagePaths(coverPath: string | null, markdown: string): Set<string> {
  const paths = new Set<string>();
  if (coverPath) paths.add(coverPath);
  for (const match of markdown.matchAll(new RegExp(`/media/(${PATH_SOURCE})`, "g"))) {
    const path = match[1];
    if (path && parseImagePath(path)) paths.add(path);
  }
  return paths;
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
