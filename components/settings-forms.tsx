"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateProfile, updateTargets, type FormResult } from "@/app/actions/data";
import type { Metric, Profile } from "@/lib/types";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ink-950/6 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-ink-950/12 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function Banner({ state, saved }: { state: FormResult; saved: string }) {
  if (state && "error" in state) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }
  if (state && "ok" in state) {
    return (
      <p className="rounded-xl border border-ember-400/30 bg-ember-400/10 px-3 py-2 text-sm text-ember-800">
        {saved}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action] = useActionState<FormResult, FormData>(updateProfile, null);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Display name
        </label>
        <input
          name="display_name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={profile?.display_name ?? ""}
          className="field"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Current focus
        </label>
        <input
          name="goal_focus"
          maxLength={120}
          defaultValue={profile?.goal_focus ?? ""}
          placeholder="Build strength without losing the aerobic base"
          className="field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Height (cm)
          </label>
          <input
            name="height_cm"
            type="number"
            min={80}
            max={260}
            defaultValue={profile?.height_cm ?? ""}
            className="field font-mono tabular-nums"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Birth year
          </label>
          <input
            name="birth_year"
            type="number"
            min={1920}
            max={new Date().getFullYear()}
            defaultValue={profile?.birth_year ?? ""}
            className="field font-mono tabular-nums"
          />
        </div>
      </div>

      <Banner state={state} saved="Profile updated." />
      <div>
        <Submit label="Save profile" />
      </div>
    </form>
  );
}

export function TargetsForm({ metrics, profile }: { metrics: Metric[]; profile: Profile | null }) {
  const daily = metrics.filter((m) => m.is_daily);
  const [state, action] = useActionState<FormResult, FormData>(updateTargets, null);

  return (
    <form action={action} className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {daily.map((metric) => (
          <li key={metric.key} className="grid gap-1.5">
            <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
              {metric.icon} {metric.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                name={`target_${metric.key}`}
                type="number"
                step={metric.step}
                min={0}
                defaultValue={
                  profile?.daily_targets?.[metric.key] ?? metric.default_target ?? ""
                }
                className="field font-mono tabular-nums"
              />
              <span className="shrink-0 text-xs text-ink-950/40">{metric.unit}</span>
            </div>
          </li>
        ))}
      </ul>

      <Banner state={state} saved="Daily targets updated — your rings recalculate instantly." />
      <div>
        <Submit label="Save targets" />
      </div>
    </form>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel p-5">
      <h3 className="text-sm font-semibold">Data &amp; account</h3>
      <p className="mt-1 text-sm text-ink-950/45">
        Every row you see is scoped to your user id by row-level security. Nothing is shared,
        and nothing is readable without your session.
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 rounded-lg border border-ink-950/12 px-3 py-1.5 text-xs text-ink-950/60 transition hover:border-ink-950/25 hover:text-ink-950"
      >
        {open ? "Hide details" : "Show details"}
      </button>
      {open && (
        <dl className="mt-4 grid gap-2 text-xs">
          {[
            ["Tables", "fit_entries · fit_workouts · fit_goals · fit_profiles"],
            ["Row policy", "user_id = auth.uid()"],
            ["Write path", "Server Actions only — never the browser"],
            ["Badge rules", "fit_evaluate_badges runs on every write"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap gap-2">
              <dt className="w-24 shrink-0 text-ink-950/35">{k}</dt>
              <dd className="font-mono text-ink-950/60">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
