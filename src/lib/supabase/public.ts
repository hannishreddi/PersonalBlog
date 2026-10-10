import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Cookie-less client for public reads. It never carries a user session, so
 * every query runs as `anon` and RLS returns only publicly visible rows, even
 * when the owner is signed in. Because it reads no request data, its results
 * can be cached with `"use cache"`.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
