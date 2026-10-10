import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <p className="text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">Owner access</p>
      <h1 className="mt-4 font-serif text-4xl font-normal tracking-[-0.02em] text-ink">Sign in</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">
        This area is only for the blog&rsquo;s owner. There is no public registration.
      </p>
      <LoginForm />
    </div>
  );
}
