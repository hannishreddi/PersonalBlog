import { Suspense } from "react";

import { CommentForm } from "@/components/engagement/comment-form";
import { ReactionButton } from "@/components/engagement/reaction-button";
import { getApprovedComments, getReactionState, isCommentingConfigured, type PublicComment } from "@/lib/engagement";
import { formatDate } from "@/lib/format";

/*
 * Likes and comments under an article. Approved comments are cached and
 * prerender with the article; the like button reads the visitor cookie, so
 * it streams in behind its own <Suspense> boundary.
 */
export async function PostEngagement({ postId }: { postId: string }) {
  const comments = await getApprovedComments(postId);

  return (
    <section aria-labelledby="responses-heading" className="mt-14 border-t border-rule pt-10">
      <h2 id="responses-heading" className="sr-only">
        Responses
      </h2>

      <Suspense fallback={<ReactionPlaceholder />}>
        <Reactions postId={postId} />
      </Suspense>

      <section aria-labelledby="comments-heading" className="mt-12">
        <h3 id="comments-heading" className="font-serif text-2xl font-normal text-ink">
          Comments
          {comments.length > 0 && <span className="ml-2 text-lg text-ink-muted tabular-nums">{comments.length}</span>}
        </h3>

        {comments.length > 0 ? (
          <ol className="mt-6 flex flex-col gap-6">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-ink-muted">No comments yet.</p>
        )}

        <h4 className="mt-12 text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Leave a comment</h4>
        {isCommentingConfigured() ? (
          <CommentForm postId={postId} />
        ) : (
          <p className="mt-4 text-ink-muted">Comments are closed for now.</p>
        )}
      </section>
    </section>
  );
}

function CommentItem({ comment }: { comment: PublicComment }) {
  return (
    <li className="rounded-2xl border border-rule bg-paper-raised px-5 py-4">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-medium text-ink">{comment.authorName}</span>
        <span aria-hidden="true" className="text-ink-muted">
          ·
        </span>
        <time dateTime={comment.createdAt} className="text-ink-muted">
          {formatDate(comment.createdAt)}
        </time>
      </p>
      {/* Plain text: React escapes it, and nothing is parsed as Markdown or HTML. */}
      <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed break-words whitespace-pre-line text-ink">
        {comment.content}
      </p>
    </li>
  );
}

async function Reactions({ postId }: { postId: string }) {
  const state = await getReactionState(postId);
  if (!state) return null;
  return <ReactionButton postId={postId} initial={state} />;
}

function ReactionPlaceholder() {
  return <div aria-hidden="true" className="h-[38px] w-40 rounded-full bg-rule/60 motion-safe:animate-pulse" />;
}
