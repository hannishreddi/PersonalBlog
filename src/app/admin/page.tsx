import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { getPostStatusCounts } from "@/lib/admin";
import { getViewerStatus } from "@/lib/auth";

import { signOut } from "./actions";

/*
 * The heading renders as static shell; everything that reads the session
 * streams in behind <Suspense>. Authorization happens on the server for every
 * request: the proxy's redirect is only a convenience.
 */
export default function AdminPage() {
  return (
    <>
      <p className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Admin</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink sm:text-5xl">
        Dashboard
      </h1>
      <Suspense fallback={<p className="mt-8 text-ink-muted" role="status">Checking access…</p>}>
        <AdminContent />
      </Suspense>
    </>
  );
}

async function AdminContent() {
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

  const counts = await getPostStatusCounts();

  return (
    <div className="mt-8">
      <p className="text-ink-soft">
        Signed in as <span className="font-medium text-ink">{viewer.owner.email ?? "the owner"}</span>.
      </p>

      <section aria-labelledby="posts-heading" className="mt-12">
        <h2 id="posts-heading" className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">
          Posts
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          {(
            [
              ["Drafts", counts.draft],
              ["Published", counts.published],
              ["Archived", counts.archived],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-rule bg-paper-raised p-5">
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="mt-1 font-serif text-3xl text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-ink-muted">
          Writing, editing, and publishing tools arrive in a later phase.
        </p>
      </section>

      <SignOutButton />
    </div>
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
