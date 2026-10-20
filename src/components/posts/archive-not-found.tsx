import Link from "next/link";

import type { ArchiveKind } from "@/lib/posts";

/**
 * Shown for unknown categories and tags, out-of-range archive pages, and
 * terms with nothing published yet. These cases look identical on purpose,
 * so a term used only by drafts or scheduled posts is never revealed.
 */
export function ArchiveNotFound({ kind }: { kind: ArchiveKind }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-24 sm:px-8 sm:py-32">
      <p className="font-hand text-3xl text-accent -rotate-2">oops! 404</p>
      <h1 className="mt-4 font-serif text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
        Nothing to read here yet.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        This {kind} doesn&rsquo;t exist, or has no published writing at the moment.
      </p>
      <Link
        href="/"
        className="btn btn-primary sticker sticker-hover mt-8"
      >
        Back to all writing
      </Link>
    </div>
  );
}
