import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/** Page 1 lives at `basePath` itself; later pages at `<basePath>/page/<n>`. */
function pageHref(basePath: string, page: number): string {
  if (page === 1) return basePath;
  return `${basePath === "/" ? "" : basePath}/page/${page}`;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Path of the first page: "/" for the main feed, or an archive path. */
  basePath?: string;
}

export function Pagination({ page, totalPages, basePath = "/" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const linkClass = "btn btn-secondary sticker sticker-hover";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-between gap-4 border-t-2 border-dashed border-rule-strong pt-8">
      <div>
        {page > 1 && (
          <Link href={pageHref(basePath, page - 1)} className={linkClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Newer writing
          </Link>
        )}
      </div>
      <p className="font-hand text-xl text-ink-soft">
        Page {page} of {totalPages}
      </p>
      <div>
        {page < totalPages && (
          <Link href={pageHref(basePath, page + 1)} className={linkClass}>
            Older writing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
