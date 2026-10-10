import type { Metadata } from "next";
import { Suspense } from "react";

import { getTaxonomyNames } from "@/lib/admin";
import { requireOwner } from "@/lib/auth";

import { BackToPosts } from "../back-link";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <>
      <BackToPosts />
      <h1 className="mt-6 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">New post</h1>
      <Suspense fallback={<p className="mt-8 text-ink-muted" role="status">Loading editor…</p>}>
        <NewPostEditor />
      </Suspense>
    </>
  );
}

async function NewPostEditor() {
  await requireOwner();
  const taxonomy = await getTaxonomyNames();
  return <PostEditor post={null} categorySuggestions={taxonomy.categories} tagSuggestions={taxonomy.tags} />;
}
