import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Public pages never read the session, so the proxy runs only on admin routes.
  matcher: ["/admin", "/admin/:path*"],
};
