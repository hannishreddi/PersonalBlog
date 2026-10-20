import type { ReactNode } from "react";

/** Section heading with a hand-drawn orange squiggle, used above feeds. */
export function FeedHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <h2 id={id} className="shrink-0 font-serif text-2xl font-semibold tracking-[-0.01em] text-ink sm:text-[1.75rem]">
        {children}
      </h2>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="h-3 min-w-0 flex-1 text-orange"
      >
        <path
          d="M0 6 Q5 0 10 6 T20 6 T30 6 T40 6 T50 6 T60 6 T70 6 T80 6 T90 6 T100 6 T110 6 T120 6 T130 6 T140 6 T150 6 T160 6 T170 6 T180 6 T190 6 T200 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
