import { ACCEPTED_EXTENSIONS, MAX_IMAGE_BYTES, formatBytes } from "@/lib/images";

/*
 * Browser side of image uploads (POST /admin/images). The checks here only
 * give quick feedback; the route validates everything again on the server.
 */

export interface UploadedImage {
  path: string;
  width: number;
  height: number;
  /** Public URL, written into Markdown. */
  url: string;
  /** Owner-only URL for previews before the post is published. */
  previewUrl: string;
}

export type UploadKind = "cover" | "inline";

/** A message if the file obviously can't be uploaded, otherwise null. */
export function checkImageFile(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ACCEPTED_EXTENSIONS[extension] || file.type === "image/svg+xml") {
    return `“${file.name}” isn’t a supported image. Use JPEG, PNG, WebP, AVIF, or GIF.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Images can be at most ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

/** The size the browser displays the image at (honours EXIF rotation). */
async function displayedSize(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(
  file: File,
  kind: UploadKind,
  onProgress?: (fraction: number) => void,
): Promise<UploadedImage> {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);

  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  const size = await displayedSize(file);
  if (size) {
    body.set("width", String(size.width));
    body.set("height", String(size.height));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/images");
    xhr.responseType = "json";
    xhr.timeout = 120_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const response = xhr.response as Partial<UploadedImage> & { error?: string } | null;
      if (xhr.status === 201 && response?.path) {
        resolve(response as UploadedImage);
      } else if (xhr.responseURL.includes("/admin/login") || xhr.status === 401) {
        reject(new Error("Your session has expired. Sign in again in another tab, then retry."));
      } else {
        reject(new Error(response?.error ?? "The upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload failed. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Please try again."));
    xhr.send(body);
  });
}
