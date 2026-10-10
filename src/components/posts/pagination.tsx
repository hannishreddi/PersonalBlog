import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

function pageHref(page: number): string {
  return page === 1 ? "/" : `/page/${page}`;
}

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const linkClass =
    "inline-flex items-center gap-2 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-between gap-4 border-t border-rule pt-8">
      <div>
        {page > 1 && (
          <Link href={pageHref(page - 1)} className={linkClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Newer writing
          </Link>
        )}
      </div>
      <p className="text-sm text-ink-muted">
        Page {page} of {totalPages}
      </p>
      <div>
        {page < totalPages && (
          <Link href={pageHref(page + 1)} className={linkClass}>
            Older writing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
