import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Privileged client for reader engagement only. It uses the secret key
 * (role `service_role`, which bypasses RLS), so:
 *
 * - it must never be imported by client code (`server-only` enforces this);
 * - call only the engagement RPCs (`submit_guest_comment`,
 *   `set_post_reaction`, `get_post_reaction_state`). They re-check that the
 *   post is public, apply rate limits, and force safe column values inside
 *   the database. Do not use this client for table reads or writes.
 *
 * Returns null when SUPABASE_SECRET_KEY is not configured, so pages still
 * render and engagement features report themselves as unavailable.
 */
export function createServiceClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;
  if (secretKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SECRET_KEY holds a publishable key. Use the secret key (sb_secret_…).");
  }

  const { url } = getSupabaseEnv();
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
