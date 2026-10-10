"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireOwner } from "@/lib/auth";
import { COMMENTS_CACHE_TAG } from "@/lib/engagement";
import { createSessionClient } from "@/lib/supabase/server";

/*
 * Comment moderation. Like every admin Server Action, this is a public
 * endpoint: it calls requireOwner() before reading input and writes with the
 * owner's session, so RLS ("comments: owner moderate" / "owner delete") and
 * the column grant (only `status` is updatable) apply again in the database.
 */

export interface ModerationState {
  error: string | null;
}

const moderationSchema = z.object({
  id: z.uuid(),
  intent: z.enum(["approve", "reject", "delete"]),
});

const STATUS_FOR_INTENT = { approve: "approved", reject: "rejected" } as const;

export async function moderateComment(_prev: ModerationState, formData: FormData): Promise<ModerationState> {
  await requireOwner();

  const parsed = moderationSchema.safeParse({ id: formData.get("id"), intent: formData.get("intent") });
  if (!parsed.success) return { error: "That comment couldn’t be identified. Reload the page and try again." };
  const { id, intent } = parsed.data;

  const supabase = await createSessionClient();
  const result =
    intent === "delete"
      ? await supabase.from("comments").delete().eq("id", id).select("id").maybeSingle()
      : await supabase.from("comments").update({ status: STATUS_FOR_INTENT[intent] }).eq("id", id).select("id").maybeSingle();

  if (result.error) return { error: "Couldn’t update the comment. Please try again." };
  if (!result.data) return { error: "This comment no longer exists. It may have been deleted in another tab." };

  // Public articles read approved comments through the "comments" cache tag.
  updateTag(COMMENTS_CACHE_TAG);
  refresh();
  return { error: null };
}
