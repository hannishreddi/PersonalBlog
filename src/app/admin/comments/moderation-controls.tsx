"use client";

import { useActionState, useState } from "react";
import { Check, Trash2, X } from "lucide-react";

import type { CommentStatus } from "@/lib/admin";

import { moderateComment, type ModerationState } from "./actions";

const initialState: ModerationState = { error: null };

const buttonClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule-strong px-4 py-1.5 text-sm text-ink transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-60";

/** Approve / reject / delete for one comment. Delete asks for confirmation. */
export function ModerationControls({
  commentId,
  status,
  authorName,
}: {
  commentId: string;
  status: CommentStatus;
  authorName: string;
}) {
  const [state, formAction, pending] = useActionState(moderateComment, initialState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="mt-4">
      {state.error && (
        <p role="alert" className="mb-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-2 text-sm text-ink">
          {state.error}
        </p>
      )}
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={commentId} />
        {confirmingDelete ? (
          <>
            <span className="text-sm font-medium text-ink">Delete this comment permanently?</span>
            <button
              type="submit"
              name="intent"
              value="delete"
              disabled={pending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirmingDelete(false)} className={buttonClass}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {status !== "approved" && (
              <button
                type="submit"
                name="intent"
                value="approve"
                disabled={pending}
                aria-label={`Approve comment by ${authorName}`}
                className={buttonClass}
              >
                <Check aria-hidden="true" className="size-3.5" />
                Approve
              </button>
            )}
            {status !== "rejected" && (
              <button
                type="submit"
                name="intent"
                value="reject"
                disabled={pending}
                aria-label={`Reject comment by ${authorName}`}
                className={buttonClass}
              >
                <X aria-hidden="true" className="size-3.5" />
                {status === "approved" ? "Unapprove (reject)" : "Reject"}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete comment by ${authorName}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent-soft"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Delete…
            </button>
            {pending && (
              <span role="status" className="text-sm text-ink-muted">
                Saving…
              </span>
            )}
          </>
        )}
      </form>
    </div>
  );
}
