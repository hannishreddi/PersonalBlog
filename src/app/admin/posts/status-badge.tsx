import type { PostStatus } from "@/types/post";

/** A published post whose publication time is still in the future. */
export function isScheduled(status: PostStatus, publishedAt: string | null, now: number): boolean {
  return status === "published" && publishedAt !== null && Date.parse(publishedAt) > now;
}

const LABELS = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
} as const;

const STYLES = {
  draft: "border-rule-strong text-ink-soft",
  published: "border-ink bg-ink text-paper",
  scheduled: "border-accent text-accent",
  archived: "border-dashed border-rule-strong text-ink-muted",
} as const;

/** Status as a text label; colour only reinforces it. */
export function StatusBadge({
  status,
  publishedAt,
  now,
}: {
  status: PostStatus;
  publishedAt: string | null;
  now: number;
}) {
  const kind = isScheduled(status, publishedAt, now) ? "scheduled" : status;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[kind]}`}>
      {LABELS[kind]}
    </span>
  );
}
