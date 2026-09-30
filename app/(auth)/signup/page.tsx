"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signUp, type AuthState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-ember-300 to-ember-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Creating…" : label}
    </button>
  );
}

export default function SignupPage() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  const pendingEmail = state && "ok" in state;

  if (pendingEmail) {
    return (
      <div className="grid gap-6 text-center">
        <span aria-hidden className="text-5xl">
          📬
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-2 text-sm text-ink-950/45">
            We sent a confirmation link. Confirm it, then sign in to start your first streak.
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-xl border border-ink-950/12 py-2.5 text-sm font-medium transition hover:bg-ink-950/5"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-ink-950/45">
          Six rings. One streak. Let&apos;s get moving.
        </p>
      </div>

      <form action={action} className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Name</span>
          <input
            name="name"
            required
            minLength={2}
            autoComplete="name"
            placeholder="Alex Rivera"
            className="field"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="field"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="field"
          />
        </label>

        {state && "error" in state && (
          <p
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
          >
            {state.error}
          </p>
        )}

        <Submit label="Create account" />

        <p className="text-center text-sm text-ink-950/45">
          Already have one?{" "}
          <Link href="/login" className="font-medium text-ember-700 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
