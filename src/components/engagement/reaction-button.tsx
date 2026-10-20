"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { setReaction } from "@/app/blog/[slug]/actions";

interface ReactionState {
  reacted: boolean;
  count: number;
}

function countLabel(count: number): string {
  return count === 1 ? "1 like" : `${count.toLocaleString("en")} likes`;
}

/**
 * Like toggle. The count updates optimistically and is then replaced by the
 * server's authoritative state; the browser never submits a count.
 */
export function ReactionButton({ postId, initial }: { postId: string; initial: ReactionState }) {
  const [state, setState] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic.reacted;
    startTransition(async () => {
      setOptimistic({ reacted: next, count: Math.max(0, optimistic.count + (next ? 1 : -1)) });
      const result = await setReaction(postId, next);
      if (result.state) setState(result.state);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimistic.reacted}
        className="group btn btn-secondary sticker sticker-hover aria-pressed:bg-peach disabled:cursor-wait"
      >
        <Heart
          aria-hidden="true"
          className="size-4 text-orange transition-transform group-aria-pressed:fill-current motion-safe:group-active:scale-90"
        />
        {optimistic.reacted ? "Liked" : "Like"}
      </button>
      <p className="text-sm text-ink-muted tabular-nums" aria-live="polite">
        {countLabel(optimistic.count)}
      </p>
      {message && (
        <p role="status" className="w-full text-sm text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}
