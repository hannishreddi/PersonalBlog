import { ListTree } from "lucide-react";

import type { ArticleHeading } from "@/lib/headings";

/** Shown only when an article has enough sections to be worth navigating. */
export const TOC_MIN_HEADINGS = 3;

function TocList({ headings }: { headings: ArticleHeading[] }) {
  return (
    <ol className="flex flex-col gap-2 text-[0.95rem] leading-snug">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "pl-4" : undefined}>
          <a
            href={`#${heading.id}`}
            className="text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline hover:decoration-orange hover:decoration-2"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Collapsible "In this article" box above the body on small screens, and a
 * sticky side column on wide ones. Only one variant is ever displayed, so
 * assistive technology meets a single navigation landmark.
 */
export function TableOfContents({ headings }: { headings: ArticleHeading[] }) {
  if (headings.length < TOC_MIN_HEADINGS) return null;

  return (
    <>
      <nav aria-label="Table of contents" className="xl:hidden">
        <details className="sticker rounded-2xl bg-peach px-5 py-4">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
            <ListTree aria-hidden="true" className="size-4" />
            In this article
          </summary>
          <div className="mt-4">
            <TocList headings={headings} />
          </div>
        </details>
      </nav>

      <nav aria-labelledby="toc-heading" className="sticky top-8 hidden xl:block">
        <h2 id="toc-heading" className="font-hand text-2xl text-accent">
          in this article ↓
        </h2>
        <div className="mt-3 border-l-2 border-dashed border-rule-strong pl-4">
          <TocList headings={headings} />
        </div>
      </nav>
    </>
  );
}
