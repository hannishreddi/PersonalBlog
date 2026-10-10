"use client";

import { useActionState } from "react";

import { signIn, type SignInState } from "../actions";

const initialState: SignInState = { error: null, email: "" };

const inputClass =
  "mt-2 block w-full rounded-xl border border-rule-strong bg-paper-raised px-4 py-2.5 text-ink placeholder:text-ink-muted";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-ink">
          <span className="font-medium">Couldn&rsquo;t sign in.</span> {state.error}
        </p>
      )}

      <label className="block text-sm font-medium text-ink">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          maxLength={320}
          defaultValue={state.email}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={1024}
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
