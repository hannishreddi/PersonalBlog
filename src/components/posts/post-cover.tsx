import Image from "next/image";

import { CoverArt } from "@/components/posts/cover-art";
import type { CoverImage } from "@/types/post";

interface PostCoverProps {
  slug: string;
  image: CoverImage | null;
  /** Tailwind aspect-ratio class; reserves space so nothing shifts on load. */
  aspectClass: string;
  roundedClass: string;
  sizes: string;
  priority?: boolean;
}

/** A cover image, or the generated fallback when a post has none. */
export function PostCover({ slug, image, aspectClass, roundedClass, sizes, priority }: PostCoverProps) {
  return (
    <div className={`relative overflow-hidden bg-paper-sunk ${aspectClass} ${roundedClass}`}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={priority}
          className="object-cover"
        />
      ) : (
        <CoverArt seed={slug} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
