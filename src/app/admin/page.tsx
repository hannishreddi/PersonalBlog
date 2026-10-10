import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, LogOut, PenLine, Plus } from "lucide-react";

import { getPostStatusCounts, isPostStatus, listAdminPosts, type AdminPostListItem } from "@/lib/admin";
import { getViewerStatus } from "@/lib/auth";
import { formatDate, formatDateTimeUtc } from "@/lib/format";
import type { PostStatus } from "@/types/post";

import { signOut } from "./actions";
import { isScheduled, StatusBadge } from "./posts/status-badge";

/*
 * The heading renders as static shell; everything that reads the session
 * streams in behind <Suspense>. Authorization happens on the server for every
 * request: the proxy's redirect is only a convenience.
 */
export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <>
      <p className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Admin</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">
        Dashboard
      </h1>
      <Suspense fallback={<p className="mt-8 text-ink-muted" role="status">Checking access…</p>}>
        <AdminContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

type SearchParams = PageProps<"/admin">["searchParams"];

const NOTICES: Record<string, string> = {
  deleted: "The post was deleted.",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function AdminContent({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getViewerStatus();

  if (viewer.kind === "anonymous") redirect("/admin/login");

  if (viewer.kind === "not-owner") {
    return (
      <div className="mt-8">
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-ink">
          <span className="font-medium">No access.</span> You&rsquo;re signed in
          {viewer.email ? ` as ${viewer.email}` : ""}, but this account isn&rsquo;t the blog&rsquo;s owner.
        </p>
        <SignOutButton />
      </div>
    );
  }

  const params = await searchParams;
  const rawStatus = first(params.status);
  const status = isPostStatus(rawStatus) ? rawStatus : null;
  const rawPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;
  const notice = NOTICES[first(params.notice) ?? ""];

  const [counts, list] = await Promise.all([getPostStatusCounts(), listAdminPosts(status, page)]);
  const total = counts.draft + counts.published + counts.archived;
  const now = list.loadedAt;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-soft">
          Signed in as <span className="font-medium text-ink">{viewer.owner.email ?? "the owner"}</span>.
        </p>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
        >
          <Plus aria-hidden="true" className="size-4" />
          New post
        </Link>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-rule-strong bg-paper-raised px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <section aria-labelledby="posts-heading" className="mt-12">
        <h2 id="posts-heading" className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">
          Posts
        </h2>

        <nav aria-label="Filter posts by status" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {(
              [
                [null, "All", total],
                ["draft", "Drafts", counts.draft],
                ["published", "Published", counts.published],
                ["archived", "Archived", counts.archived],
              ] as const
            ).map(([value, label, count]) => (
              <li key={label}>
                <Link
                  href={value ? `/admin?status=${value}` : "/admin"}
                  aria-current={value === status ? "page" : undefined}
                  className="inline-flex items-center gap-2 rounded-full border border-rule-strong px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
                >
                  {label}
                  <span className="tabular-nums opacity-80">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {list.posts.length > 0 ? (
          <ul className="mt-6 border-t border-rule">
            {list.posts.map((post) => (
              <PostRow key={post.id} post={post} now={now} />
            ))}
          </ul>
        ) : (
          <EmptyList status={status} total={total} page={page} />
        )}

        <AdminPagination status={status} page={list.page} totalPages={list.totalPages} />
      </section>

      <SignOutButton />
    </div>
  );
}

function describeDate(post: AdminPostListItem, now: number): string {
  if (isScheduled(post.status, post.publishedAt, now)) {
    return `Scheduled for ${formatDateTimeUtc(post.publishedAt!)}`;
  }
  if (post.status === "published" && post.publishedAt) {
    return `Published ${formatDate(post.publishedAt)} · edited ${formatDate(post.updatedAt)}`;
  }
  return `Edited ${formatDate(post.updatedAt)}`;
}

function PostRow({ post, now }: { post: AdminPostListItem; now: number }) {
  const live = post.status === "published" && !isScheduled(post.status, post.publishedAt, now);

  return (
    <li className="flex flex-col gap-3 border-b border-rule py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/admin/posts/${post.id}`}
          className="font-serif text-xl leading-snug text-balance text-ink decoration-accent/60 underline-offset-4 hover:underline"
        >
          {post.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <StatusBadge status={post.status} publishedAt={post.publishedAt} now={now} />
          <span>{describeDate(post, now)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/admin/posts/${post.id}`}
          aria-label={`Edit “${post.title}”`}
          className="inline-flex items-center gap-1.5 rounded-full border border-rule-strong px-4 py-1.5 text-sm text-ink transition-colors hover:border-ink"
        >
          <PenLine aria-hidden="true" className="size-3.5" />
          Edit
        </Link>
        {live && (
          <Link
            href={`/blog/${post.slug}`}
            aria-label={`View “${post.title}” on the site`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            View
          </Link>
        )}
      </div>
    </li>
  );
}

const EMPTY_LABELS: Record<PostStatus, string> = {
  draft: "No drafts.",
  published: "Nothing is published yet.",
  archived: "No archived posts.",
};

function EmptyList({ status, total, page }: { status: PostStatus | null; total: number; page: number }) {
  let message: React.ReactNode;
  if (page > 1) {
    message = (
      <>
        There are no posts on this page.{" "}
        <Link href={status ? `/admin?status=${status}` : "/admin"} className="text-accent underline underline-offset-4">
          Go to the first page
        </Link>
        .
      </>
    );
  } else if (total === 0) {
    message = (
      <>
        No posts yet.{" "}
        <Link href="/admin/posts/new" className="text-accent underline underline-offset-4">
          Write your first one
        </Link>
        .
      </>
    );
  } else {
    message = status ? EMPTY_LABELS[status] : "No posts.";
  }

  return (
    <p className="mt-6 rounded-2xl border border-dashed border-rule-strong px-6 py-12 text-center text-ink-muted">
      {message}
    </p>
  );
}

function AdminPagination({ status, page, totalPages }: { status: PostStatus | null; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `/admin?${qs}` : "/admin";
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

function SignOutButton() {
  return (
    <form action={signOut} className="mt-12 border-t border-rule pt-8">
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-paper-raised"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </button>
    </form>
  );
}
