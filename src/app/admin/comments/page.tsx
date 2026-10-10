import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  getCommentStatusCounts,
  isCommentStatus,
  listAdminComments,
  type AdminComment,
  type CommentStatus,
} from "@/lib/admin";
import { requireOwner } from "@/lib/auth";
import { formatDateTimeUtc } from "@/lib/format";

import { BackToPosts } from "../posts/back-link";
import { isScheduled } from "../posts/status-badge";
import { ModerationControls } from "./moderation-controls";

/*
 * Moderation queue. The page and every action authorize with
 * requireOwner(); reads use the owner's session, so RLS applies too.
 */
export default function CommentsPage(props: PageProps<"/admin/comments">) {
  return (
    <>
      <BackToPosts />
      <p className="mt-10 text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Admin</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">Comments</h1>
      <Suspense fallback={<p className="mt-8 text-ink-muted" role="status">Loading comments…</p>}>
        <CommentsContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const TABS: readonly [CommentStatus, string][] = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
];

const EMPTY_LABELS: Record<CommentStatus, string> = {
  pending: "Nothing waiting for review.",
  approved: "No approved comments.",
  rejected: "No rejected comments.",
};

async function CommentsContent({ searchParams }: { searchParams: PageProps<"/admin/comments">["searchParams"] }) {
  await requireOwner();

  const params = await searchParams;
  const rawStatus = first(params.status);
  const status: CommentStatus = isCommentStatus(rawStatus) ? rawStatus : "pending";
  const rawPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;

  const [counts, list] = await Promise.all([getCommentStatusCounts(), listAdminComments(status, page)]);

  return (
    <div className="mt-8">
      <p className="text-ink-soft">
        New comments wait here until you approve them. Only approved comments appear on articles.
      </p>

      <nav aria-label="Filter comments by status" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {TABS.map(([value, label]) => (
            <li key={value}>
              <Link
                href={value === "pending" ? "/admin/comments" : `/admin/comments?status=${value}`}
                aria-current={value === status ? "page" : undefined}
                className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
              >
                {label}
                <span className="tabular-nums opacity-80">{counts[value]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {list.comments.length > 0 ? (
        <ul className="mt-6 border-t border-rule">
          {list.comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} now={list.loadedAt} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center text-ink-muted">
          {page > 1 ? "There are no comments on this page." : EMPTY_LABELS[status]}
        </p>
      )}

      <Pagination status={status} page={list.page} totalPages={list.totalPages} />
    </div>
  );
}

function postNote(post: NonNullable<AdminComment["post"]>, now: number): string | null {
  if (isScheduled(post.status, post.publishedAt, now)) return "scheduled";
  return post.status === "published" ? null : post.status;
}

function CommentRow({ comment, now }: { comment: AdminComment; now: number }) {
  const note = comment.post ? postNote(comment.post, now) : null;
  return (
    <li className="border-b border-rule py-6">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="font-medium text-ink">{comment.authorName}</span>
        <span aria-hidden="true" className="text-ink-muted">
          ·
        </span>
        <time dateTime={comment.createdAt} className="text-ink-muted">
          {formatDateTimeUtc(comment.createdAt)}
        </time>
      </p>
      {comment.post && (
        <p className="mt-1 text-sm text-ink-muted">
          On{" "}
          <Link
            href={`/admin/posts/${comment.post.id}`}
            className="text-ink-soft underline decoration-rule-strong underline-offset-4 hover:text-ink"
          >
            {comment.post.title}
          </Link>
          {note && <span> ({note}, hidden from readers)</span>}
        </p>
      )}
      <p className="mt-3 rounded-xl bg-paper-raised px-4 py-3 font-serif leading-relaxed break-words whitespace-pre-line text-ink">
        {comment.content}
      </p>
      <ModerationControls commentId={comment.id} status={comment.status} authorName={comment.authorName} />
    </li>
  );
}

function Pagination({ status, page, totalPages }: { status: CommentStatus; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    if (status !== "pending") query.set("status", status);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/admin/comments?${qs}` : "/admin/comments";
  };
  const linkClass =
    "inline-flex items-center gap-2 rounded-full border border-rule-strong px-4 py-2 text-sm text-ink transition-colors hover:border-ink";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      <div>
        {page > 1 && (
          <Link href={href(page - 1)} className={linkClass}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Newer
          </Link>
        )}
      </div>
      <p className="text-sm text-ink-muted">
        Page {page} of {totalPages}
      </p>
      <div>
        {page < totalPages && (
          <Link href={href(page + 1)} className={linkClass}>
            Older
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
