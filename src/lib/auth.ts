import "server-only";

import { redirect } from "next/navigation";

import { createSessionClient } from "@/lib/supabase/server";

/*
 * Owner authorization. The only source of truth is `private.blog_owner`,
 * queried through `public.is_blog_owner()`, which compares the registry with
 * the user id in the verified JWT. Nothing from the client (form fields,
 * headers, roles) is trusted. Call `requireOwner()` at the start of every
 * admin page, Server Action, and Route Handler.
 */

export interface Owner {
  id: string;
  email: string | null;
}

export type ViewerStatus =
  | { kind: "anonymous" }
  | { kind: "not-owner"; email: string | null }
  | { kind: "owner"; owner: Owner };

export async function getViewerStatus(): Promise<ViewerStatus> {
  const supabase = await createSessionClient();

  // getClaims() verifies the access token's signature; getSession() would not.
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { kind: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : null;

  const { data: isOwner, error: rpcError } = await supabase.rpc("is_blog_owner");
  if (rpcError) {
    // Fail closed, and don't leak database details to the caller.
    throw new Error("Could not verify owner access.");
  }

  return isOwner === true ? { kind: "owner", owner: { id: claims.sub, email } } : { kind: "not-owner", email };
}

/**
 * Returns the owner, or ends the request: anonymous visitors go to the login
 * page; signed-in non-owners go to /admin, which explains they lack access.
 */
export async function requireOwner(): Promise<Owner> {
  const status = await getViewerStatus();
  if (status.kind === "anonymous") redirect("/admin/login");
  if (status.kind === "not-owner") redirect("/admin");
  return status.owner;
}
