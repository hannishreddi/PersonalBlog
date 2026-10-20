import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatTagName } from "@/lib/format";
import type { ArchiveKind, TopicCount } from "@/lib/posts";

interface TopicChipsProps {
  kind: ArchiveKind;
  topics: TopicCount[];
  /** Link to the full topic list, shown after the chips when set. */
  moreHref?: string;
  className?: string;
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "post" : "posts"}`;
}

/** Category or tag links as tilted sticker chips with post counts. */
export function TopicChips({ kind, topics, moreHref, className = "" }: TopicChipsProps) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {topics.map((topic, i) => (
        <li key={topic.slug}>
          <Link
            href={`/${kind}/${topic.slug}`}
            className={`sticker sticker-hover inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold ${
              i % 3 === 0 ? "bg-orange text-on-orange" : i % 3 === 1 ? "bg-peach text-ink" : "bg-paper-raised text-ink"
            } ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}
          >
            {kind === "tag" ? formatTagName(topic.name) : topic.name}
            <span className="rounded-full bg-paper-raised/70 px-2 text-xs font-bold text-ink tabular-nums">
              <span aria-hidden="true">{topic.count}</span>
              <span className="sr-only">({countLabel(topic.count)})</span>
            </span>
          </Link>
        </li>
      ))}
      {moreHref && (
        <li>
          <Link
            href={moreHref}
            className="inline-flex items-center gap-1.5 px-2 py-2 font-semibold text-ink underline decoration-orange decoration-2 underline-offset-4"
          >
            All topics
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </li>
      )}
    </ul>
  );
}
