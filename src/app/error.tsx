"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-24 sm:px-8 sm:py-32">
      <p className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Error</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">
        Something went wrong.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        This page couldn&rsquo;t be loaded. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 cursor-pointer rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised"
      >
        Try again
      </button>
    </div>
  );
}
