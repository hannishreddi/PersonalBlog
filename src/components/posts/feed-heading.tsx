import type { ReactNode } from "react";

/** Small-caps section label with a hairline rule, used above feeds. */
export function FeedHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <h2 id={id} className="shrink-0 text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">
        {children}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-rule" />
    </div>
  );
}
