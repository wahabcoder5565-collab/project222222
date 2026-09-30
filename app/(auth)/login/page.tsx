"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { signIn, type AuthState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-ember-300 to-ember-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "One sec…" : label}
    </button>
  );
}

function Banner({ state }: { state: AuthState }) {
  if (!state || !("error" in state)) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
    >
      {state.error}
    </p>
  );
}

function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          placeholder="••••••••"
          className="field"
        />
      </label>

      <Banner state={state} />
      <Submit label="Sign in" />

      <p className="text-center text-sm text-ink-950/45">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ember-700 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="rounded-xl border border-ink-950/8 bg-ink-950/3 px-3 py-2.5">
        <p className="text-[11px] font-medium tracking-wide text-ink-950/40 uppercase">
          Demo account
        </p>
        <p className="mt-1 font-mono text-xs text-ink-950/60">
          alex@fitpulse.app · fitpulse123
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-ink-950/45">Your streak is waiting on you.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
