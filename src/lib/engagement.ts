import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { createServiceClient } from "@/lib/supabase/service";
import { getReactorHash, isVisitorHashingConfigured } from "@/lib/visitor";

/*
 * Public engagement reads.
 *
 * - Approved comments come from the cookie-less anon client, so RLS returns
 *   only approved comments on posts that are public right now. Pending and
 *   rejected comments cannot reach this module. Results are cached and tagged
 *   "comments"; moderation actions call updateTag("comments").
 * - Reaction state is per visitor (it reads the visitor cookie), so it is
 *   never cached and renders behind <Suspense>.
 */

export const COMMENTS_CACHE_TAG = "comments";

/** At most this many approved comments are shown per article. */
const MAX_PUBLIC_COMMENTS = 200;

export interface PublicComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export async function getApprovedComments(postId: string): Promise<PublicComment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(COMMENTS_CACHE_TAG);

  const { data, error } = await createPublicClient()
    .from("comments")
    .select("id, author_name, content, created_at")
    .eq("post_id", postId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(MAX_PUBLIC_COMMENTS);
  if (error) throw new Error("Could not load comments.");

  // Only the public fields; status and post_id stay on the server.
  return data.map((row) => ({
    id: row.id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export interface ReactionState {
  reacted: boolean;
  count: number;
}

/**
 * Like count and whether this visitor liked the post. Null when engagement
 * isn't configured, the post isn't public, or the lookup fails.
 */
export async function getReactionState(postId: string): Promise<ReactionState | null> {
  // Always request-time, even when engagement isn't configured, so the like
  // button is never baked into the static shell.
  await connection();
  const supabase = createServiceClient();
  if (!supabase || !isVisitorHashingConfigured()) return null;

  const reactor = await getReactorHash();
  const { data, error } = await supabase
    // The function accepts null (no cookie); generated types can't express that.
    .rpc("get_post_reaction_state", { p_post_id: postId, p_reactor: reactor as string })
    .maybeSingle();
  if (error || !data) return null;

  return { reacted: data.reacted, count: data.reaction_count };
}

/** Whether guest comments can be submitted (server keys configured). */
export function isCommentingConfigured(): boolean {
  return isVisitorHashingConfigured() && !!process.env.SUPABASE_SECRET_KEY;
}
