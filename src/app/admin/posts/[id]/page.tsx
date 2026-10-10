import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { z } from "zod";

import { getAdminPost, getTaxonomyNames } from "@/lib/admin";
import { requireOwner } from "@/lib/auth";

import { BackToPosts } from "../back-link";
import { DeletePostForm } from "../delete-post-form";
import { PostEditor } from "../post-editor";
import { isScheduled } from "../status-badge";

export const metadata: Metadata = { title: "Edit post" };

const NOTICES: Record<string, { text: string; error?: boolean }> = {
  created: { text: "Post created." },
  "tags-failed": { text: "Post created, but its tags couldn’t be saved. Save again to retry.", error: true },
};

export default function EditPostPage(props: PageProps<"/admin/posts/[id]">) {
  return (
    <>
      <BackToPosts />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">Edit post</h1>
      <Suspense fallback={<p className="mt-8 text-ink-muted" role="status">Loading post…</p>}>
        <EditPostContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function EditPostContent({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/posts/[id]">["params"];
  searchParams: PageProps<"/admin/posts/[id]">["searchParams"];
}) {
  // Authorize before looking at the URL, so nothing is revealed to non-owners.
  await requireOwner();

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [post, taxonomy, query] = await Promise.all([getAdminPost(id), getTaxonomyNames(), searchParams]);
  if (!post) notFound();

  const noticeKey = Array.isArray(query.notice) ? query.notice[0] : query.notice;
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;
  const live = post.status === "published" && !isScheduled(post.status, post.publishedAt, post.loadedAt);

  return (
    <>
      {(notice || live) && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {notice && (
            <p
              role={notice.error ? "alert" : "status"}
              className={`rounded-xl border px-4 py-3 text-sm text-ink ${
                notice.error ? "border-accent/40 bg-accent-soft" : "border-rule-strong bg-paper-raised"
              }`}
            >
              {notice.text}
            </p>
          )}
          {live && (
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              <ExternalLink aria-hidden="true" className="size-3.5" />
              View on the site
            </Link>
          )}
        </div>
      )}
      <PostEditor
        key={post.id}
        post={post}
        categorySuggestions={taxonomy.categories}
        tagSuggestions={taxonomy.tags}
      />
      <DeletePostForm postId={post.id} title={post.title} />
    </>
  );
}
