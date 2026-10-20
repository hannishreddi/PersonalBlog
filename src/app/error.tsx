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
      <p className="font-hand text-3xl text-accent -rotate-2">uh oh…</p>
      <h1 className="mt-4 font-serif text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
        Something went wrong.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        This page couldn&rsquo;t be loaded. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="btn btn-primary sticker sticker-hover mt-8"
      >
        Try again
      </button>
    </div>
  );
}
