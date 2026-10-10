import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Per-request client bound to the visitor's auth cookies. Use it only for
 * owner/admin work, after `getOwner()` / `requireOwner()`. Public pages use
 * `createPublicClient()` instead so they stay cacheable and session-free.
 */
export async function createSessionClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. The proxy refreshes the
          // session on /admin requests, so this is safe to ignore there.
        }
      },
    },
  });
}
