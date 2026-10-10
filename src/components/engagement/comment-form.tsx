"use client";

import { useActionState } from "react";

import { submitComment, type CommentFormState } from "@/app/blog/[slug]/actions";
import { COMMENT_HONEYPOT_FIELD, COMMENT_LIMITS } from "@/lib/comment-limits";

const initialState: CommentFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: { authorName: "", content: "" },
};

const inputClass =
  "mt-2 block w-full rounded-xl border border-rule-strong bg-paper-raised px-4 py-2.5 font-sans text-base text-ink placeholder:text-ink-muted aria-[invalid=true]:border-accent";

export function CommentForm({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState(submitComment, initialState);
  const { fieldErrors } = state;

  return (
    // key resets the uncontrolled fields to the server's echoed values after each submit.
    <form key={`${state.status}-${state.message}`} action={formAction} className="mt-6 flex flex-col gap-5" noValidate>
      <input type="hidden" name="postId" value={postId} />

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm text-ink ${
            state.status === "error" ? "border-accent/40 bg-accent-soft" : "border-rule-strong bg-paper-raised"
          }`}
        >
          {state.message}
        </p>
      )}

      {/* Honeypot: hidden from people and assistive technology; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name={COMMENT_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div>
        <label htmlFor="comment-name" className="block text-sm font-medium text-ink">
          Name
        </label>
        <input
          id="comment-name"
          name="authorName"
          type="text"
          required
          maxLength={COMMENT_LIMITS.authorName}
          autoComplete="nickname"
          defaultValue={state.values.authorName}
          aria-invalid={fieldErrors.authorName ? true : undefined}
          aria-describedby={fieldErrors.authorName ? "comment-name-error" : "comment-name-hint"}
          className={inputClass}
        />
        {fieldErrors.authorName ? (
          <p id="comment-name-error" className="mt-2 text-sm text-accent">
            {fieldErrors.authorName}
          </p>
        ) : (
          <p id="comment-name-hint" className="mt-2 text-sm text-ink-muted">
            Shown publicly with your comment. No email or account needed.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="comment-content" className="block text-sm font-medium text-ink">
          Comment
        </label>
        <textarea
          id="comment-content"
          name="content"
          required
          rows={5}
          maxLength={COMMENT_LIMITS.content}
          defaultValue={state.values.content}
          aria-invalid={fieldErrors.content ? true : undefined}
          aria-describedby={fieldErrors.content ? "comment-content-error" : "comment-content-hint"}
          className={`${inputClass} resize-y leading-relaxed`}
        />
        {fieldErrors.content ? (
          <p id="comment-content-error" className="mt-2 text-sm text-accent">
            {fieldErrors.content}
          </p>
        ) : (
          <p id="comment-content-hint" className="mt-2 text-sm text-ink-muted">
            Plain text. Comments are reviewed before they appear.
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send comment"}
        </button>
      </div>
    </form>
  );
}
