import { formatDate, formatReadingTime } from "@/lib/format";

interface PostMetaProps {
  publishedAt: string;
  readingTimeMinutes: number;
  className?: string;
}

export function PostMeta({ publishedAt, readingTimeMinutes, className = "" }: PostMetaProps) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-sm text-ink-muted ${className}`}>
      <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{formatReadingTime(readingTimeMinutes)}</span>
    </p>
  );
}
