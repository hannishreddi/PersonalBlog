"use server";

import { z } from "zod";

import { COMMENT_HONEYPOT_FIELD, COMMENT_LIMITS } from "@/lib/comment-limits";
import { isCommentingConfigured } from "@/lib/engagement";
import { createServiceClient } from "@/lib/supabase/service";
import { getClientHash, getOrCreateReactorHash, getReactorHash, isVisitorHashingConfigured } from "@/lib/visitor";

/*
 * Reader engagement. These Server Actions are public endpoints that anyone
 * can call directly, so nothing from the browser is trusted beyond the
 * validated fields below:
 *
 * - The visitor hash and client hash are computed here from the HttpOnly
 *   cookie and request IP; the browser never supplies them.
 * - The database functions re-check that the post is public at the time of
 *   the request (published, published_at <= now()), apply rate limits, and
 *   force comment status to 'pending', all in one transaction.
 * - Errors are reported generically; database details and hashes never
 *   reach the client, and no request data is logged.
 */

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export interface ReactionResult {
  /** The visitor's current state, or null if it couldn't be determined. */
  state: { reacted: boolean; count: number } | null;
  message: string | null;
}

const reactionSchema = z.object({ postId: z.uuid(), reacted: z.boolean() });

export async function setReaction(postId: string, reacted: boolean): Promise<ReactionResult> {
  const parsed = reactionSchema.safeParse({ postId, reacted });
  const supabase = createServiceClient();
  const unavailable: ReactionResult = { state: null, message: "Likes aren’t available right now. Please try again later." };
  if (!parsed.success || !supabase || !isVisitorHashingConfigured()) return unavailable;

  // Removing a like needs no cookie; don't issue one just for that.
  const reactor = parsed.data.reacted ? await getOrCreateReactorHash() : await getReactorHash();
  if (!reactor) return unavailable;

  const { data, error } = await supabase
    .rpc("set_post_reaction", {
      p_post_id: parsed.data.postId,
      p_reactor: reactor,
      p_client: await getClientHash(),
      p_reacted: parsed.data.reacted,
    })
    .maybeSingle();
  if (error || !data) return unavailable;

  const state = { reacted: data.reacted, count: data.reaction_count };
  switch (data.outcome) {
    case "ok":
      return { state, message: null };
    case "rate_limited":
      return { state, message: "That’s a lot of clicks. Please wait a few minutes and try again." };
    default:
      return { state: null, message: "This post isn’t accepting likes." };
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export type CommentField = "authorName" | "content";

export interface CommentFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<CommentField, string>>;
  /** Echoed back on error so the reader doesn't lose their text. */
  values: Record<CommentField, string>;
}

// Control characters other than tab and newline; also bidi overrides,
// which can make displayed text misleading.
const UNSAFE_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const LINK_PATTERN = /\bhttps?:\/\/|\bwww\./gi;

const commentSchema = z.object({
  postId: z.uuid(),
  authorName: z
    .string()
    .trim()
    .min(1, "Enter a name to show with your comment.")
    .max(COMMENT_LIMITS.authorName, `Keep your name under ${COMMENT_LIMITS.authorName} characters.`),
  content: z
    .string()
    .trim()
    .min(COMMENT_LIMITS.contentMin, "Write a comment first.")
    .max(COMMENT_LIMITS.content, `Keep your comment under ${COMMENT_LIMITS.content.toLocaleString("en")} characters.`)
    .refine(
      (text) => (text.match(LINK_PATTERN)?.length ?? 0) <= COMMENT_LIMITS.links,
      `Please include at most ${COMMENT_LIMITS.links} links.`,
    ),
});

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function submitComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const values = {
    authorName: text(formData, "authorName").replace(UNSAFE_CHARACTERS, "").replace(/\s+/g, " "),
    content: text(formData, "content").replace(/\r\n?/g, "\n").replace(UNSAFE_CHARACTERS, ""),
  };
  const error = (message: string, fieldErrors: CommentFormState["fieldErrors"] = {}): CommentFormState => ({
    status: "error",
    message,
    fieldErrors,
    values,
  });
  const success: CommentFormState = {
    status: "success",
    message: "Thank you. Your comment will appear once it’s been approved.",
    fieldErrors: {},
    values: { authorName: values.authorName, content: "" },
  };

  // Honeypot: bots that fill every field get the normal success response,
  // so they learn nothing, but the comment is dropped.
  if (text(formData, COMMENT_HONEYPOT_FIELD) !== "") return success;

  const parsed = commentSchema.safeParse({ postId: text(formData, "postId"), ...values });
  if (!parsed.success) {
    const fieldErrors: CommentFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "authorName" || field === "content") && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    if (Object.keys(fieldErrors).length === 0) return error("This comment form is out of date. Reload the page and try again.");
    return error("Please fix the highlighted fields.", fieldErrors);
  }

  const supabase = createServiceClient();
  if (!supabase || !isCommentingConfigured()) return error("Comments aren’t available right now.");

  const { data: outcome, error: rpcError } = await supabase.rpc("submit_guest_comment", {
    p_post_id: parsed.data.postId,
    p_author_name: parsed.data.authorName,
    p_content: parsed.data.content,
    p_client: await getClientHash(),
  });
  if (rpcError) return error("Your comment couldn’t be sent. Please try again.");

  switch (outcome) {
    case "ok":
      return success;
    case "rate_limited":
      return error("You’ve sent several comments in a short time. Please wait a while before sending another.");
    default:
      return error("This post isn’t accepting comments.");
  }
}
