import "server-only";

import { requireOwner } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import type { PostStatus } from "@/types/post";

/*
 * Owner-only data access. Each function authorizes itself with
 * requireOwner() and then queries with the owner's session, so RLS enforces
 * the same rule a second time in the database.
 */

const STATUSES: PostStatus[] = ["draft", "published", "archived"];

export async function getPostStatusCounts(): Promise<Record<PostStatus, number>> {
  await requireOwner();
  const supabase = await createSessionClient();

  const entries = await Promise.all(
    STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (error) throw new Error("Could not load post counts.");
      return [status, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<PostStatus, number>;
}
