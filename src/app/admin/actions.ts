"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSessionClient } from "@/lib/supabase/server";

/*
 * Server Actions are public endpoints: anyone can POST to them directly.
 * signIn only establishes a session; it grants nothing by itself. Every
 * privileged action must call requireOwner() before doing any work.
 */

export interface SignInState {
  error: string | null;
  email: string;
}

const signInSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(1024),
});

const INVALID_CREDENTIALS = "That email and password combination didn't work.";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: "Enter a valid email address and your password.", email };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Supabase applies its own rate limits; surface those distinctly.
    const message =
      error.status === 429 ? "Too many sign-in attempts. Please wait a few minutes and try again." : INVALID_CREDENTIALS;
    return { error: message, email };
  }

  // Valid credentials alone are not enough: only the registered owner keeps a session.
  const { data: isOwner, error: rpcError } = await supabase.rpc("is_blog_owner");
  if (rpcError || isOwner !== true) {
    await supabase.auth.signOut();
    return {
      error: rpcError
        ? "Couldn't verify access right now. Please try again."
        : "This account isn't authorised to manage this blog.",
      email,
    };
  }

  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
