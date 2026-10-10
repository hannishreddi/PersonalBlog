import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToPosts() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All posts
    </Link>
  );
}
