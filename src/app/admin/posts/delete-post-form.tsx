"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { deletePost, type DeletePostState } from "./actions";

const initialState: DeletePostState = { error: null };

/** Two-step delete: the first click only reveals the confirmation. */
export function DeletePostForm({ postId, title }: { postId: string; title: string }) {
  const [state, formAction, pending] = useActionState(deletePost, initialState);
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby="delete-heading" className="mt-16 border-t border-rule pt-8">
      <h2 id="delete-heading" className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">
        Delete post
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Deleting removes the post, its tag links, and any comments and reactions it has. This can&rsquo;t be
        undone. To hide a post but keep it, unpublish or archive it instead.
      </p>

      {state.error && (
        <p role="alert" className="mt-4 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      {confirming ? (
        <form action={formAction} className="mt-5 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={postId} />
          <p className="w-full text-sm font-medium text-ink">Delete &ldquo;{title || "Untitled"}&rdquo; permanently?</p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent/60 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Delete…
        </button>
      )}
    </section>
  );
}
