import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

const LOGIN_PATH = "/admin/login";

/**
 * Refreshes the Supabase session cookies for /admin requests and redirects
 * visitors without a valid session to the login page.
 *
 * This is only an optimistic check. It does not decide ownership: every admin
 * page and Server Action calls `requireOwner()` itself.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep this call directly after creating the client: it verifies the JWT
  // and triggers the token refresh that writes the cookies above.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && request.nextUrl.pathname !== LOGIN_PATH) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    const redirect = NextResponse.redirect(loginUrl);
    // Carry over any cookie changes (e.g. clearing an expired session).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
