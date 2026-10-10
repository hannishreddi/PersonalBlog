import "server-only";

import { MAX_IMAGE_DIMENSION, type ImageMimeType } from "@/lib/images";

/*
 * Identifies an uploaded image from its bytes (never from the browser's
 * declared type or file name) and reads its pixel dimensions from the header.
 * Anything that isn't a well-formed JPEG, PNG, WebP, AVIF, or GIF header is
 * rejected, which also rules out SVG, HTML, and other active content.
 */

export interface SniffedImage {
  type: ImageMimeType;
  width: number;
  height: number;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function png(bytes: Uint8Array, view: DataView): SniffedImage | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !signature.every((byte, i) => bytes[i] === byte)) return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  return { type: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
}

function gif(bytes: Uint8Array, view: DataView): SniffedImage | null {
  const header = ascii(bytes, 0, 6);
  if (bytes.length < 10 || (header !== "GIF87a" && header !== "GIF89a")) return null;
  return { type: "image/gif", width: view.getUint16(6, true), height: view.getUint16(8, true) };
}

const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function jpeg(bytes: Uint8Array, view: DataView): SniffedImage | null {
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8 || view.getUint8(2) !== 0xff) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (view.getUint8(i) !== 0xff) return null;
    const marker = view.getUint8(i + 1);
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (JPEG_SOF.has(marker)) {
      return { type: "image/jpeg", width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end or scan data before a frame header
    i += 2 + view.getUint16(i + 2);
  }
  return null;
}

function webp(bytes: Uint8Array, view: DataView): SniffedImage | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 ") {
    return {
      type: "image/webp",
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (view.getUint8(20) !== 0x2f) return null;
    const [b0, b1, b2, b3] = [21, 22, 23, 24].map((at) => view.getUint8(at)) as [number, number, number, number];
    return {
      type: "image/webp",
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X") {
    const u24 = (at: number) => view.getUint16(at, true) | (view.getUint8(at + 2) << 16);
    return { type: "image/webp", width: 1 + u24(24), height: 1 + u24(27) };
  }
  return null;
}

function avif(bytes: Uint8Array, view: DataView): SniffedImage | null {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return null;
  const ftypSize = view.getUint32(0);
  if (ftypSize < 16 || ftypSize > Math.min(bytes.length, 256)) return null;
  // Major brand plus compatible brands (skipping the minor version).
  const brands = [ascii(bytes, 8, 4)];
  for (let at = 16; at + 4 <= ftypSize; at += 4) brands.push(ascii(bytes, at, 4));
  if (!brands.includes("avif") && !brands.includes("avis")) return null;

  // The first 'ispe' (image spatial extents) property holds the primary
  // image size: box header, 4 bytes version/flags, then width and height.
  const limit = Math.min(bytes.length, 64 * 1024) - 16;
  for (let i = ftypSize; i < limit; i++) {
    if (view.getUint8(i) === 0x69 && ascii(bytes, i, 4) === "ispe") {
      return { type: "image/avif", width: view.getUint32(i + 8), height: view.getUint32(i + 12) };
    }
  }
  return null;
}

/** Returns the image's real type and size, or null if it isn't an accepted image. */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let result: SniffedImage | null = null;
  try {
    result = png(bytes, view) ?? gif(bytes, view) ?? jpeg(bytes, view) ?? webp(bytes, view) ?? avif(bytes, view);
  } catch {
    // Truncated headers read past the end of the buffer.
    return null;
  }
  if (!result || result.width < 1 || result.height < 1) return null;
  return result;
}

export function withinDimensionLimit({ width, height }: { width: number; height: number }): boolean {
  return width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION;
}
