"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import { logEntry, logWorkout, type FormResult } from "@/app/actions/data";
import { ACTIVITIES, FEELINGS, accentFor, accentInk, todayISO } from "@/lib/format";
import type { Metric } from "@/lib/types";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-r from-ember-300 to-ember-500 px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function Banner({ state }: { state: FormResult }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
      >
        {state.error}
      </p>
    );
  }
  return (
    <p className="rounded-xl border border-ember-400/30 bg-ember-400/10 px-3 py-2 text-sm text-ember-800">
      {state.newBadges?.length
        ? `Saved — and you just unlocked ${state.newBadges.length} new badge${state.newBadges.length > 1 ? "s" : ""}!`
        : "Saved."}
    </p>
  );
}

const CATEGORIES = [
  { key: "lifestyle", label: "Lifestyle" },
  { key: "recovery", label: "Recovery" },
  { key: "cardio", label: "Cardio" },
  { key: "strength", label: "Strength" },
  { key: "body", label: "Body" },
] as const;

export function LogMetricForm({ metrics }: { metrics: Metric[] }) {
  const params = useSearchParams();
  const preset = params.get("metric");
  const initial = metrics.find((m) => m.key === preset) ?? metrics[0];

  const [metricKey, setMetricKey] = useState(initial?.key ?? "");
  const [state, action] = useActionState<FormResult, FormData>(logEntry, null);
  const metric = metrics.find((m) => m.key === metricKey);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Metric</span>
        <select
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          className="field"
        >
          {CATEGORIES.map((cat) => (
            <optgroup key={cat.key} label={cat.label}>
              {metrics
                .filter((m) => m.category === cat.key)
                .map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.unit})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {metric && (
        <>
          <input type="hidden" name="metric_id" value={metric.id} />
          <div className="grid gap-1.5">
            <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
              Value {metric.direction === "lower" ? "(lower is better)" : ""}
            </label>
            <div className="flex items-center gap-2">
              <input
                name="value"
                type="number"
                step={metric.step}
                min={0}
                required
                placeholder={metric.default_target ? `e.g. ${metric.default_target}` : "0"}
                className="field font-mono tabular-nums"
              />
              <span
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                style={{ background: `${accentFor(metric)}1a`, color: accentInk(accentFor(metric)) }}
              >
                {metric.unit}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Date</label>
        <input
          name="entry_date"
          type="date"
          required
          max={todayISO()}
          defaultValue={todayISO()}
          className="field"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Note (optional)
        </label>
        <input name="note" maxLength={280} placeholder="Felt strong today" className="field" />
      </div>

      <Banner state={state} />
      <div>
        <Submit label="Save entry" />
      </div>
    </form>
  );
}

const FEELING_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  ok: "😐",
  rough: "😮‍💨",
};

export function LogWorkoutForm() {
  const [state, action] = useActionState<FormResult, FormData>(logWorkout, null);
  const [activity, setActivity] = useState<string>(ACTIVITIES[0]);
  const showDistance = activity === "Run" || activity === "Cycle" || activity === "Row" || activity === "Swim";

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Activity</span>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setActivity(a)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                activity === a
                  ? "border-ember-400/50 bg-ember-400/12 text-ink-950"
                  : "border-ink-950/8 bg-ink-950/3 text-ink-950/55 hover:border-ink-950/16 hover:text-ink-950"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <input type="hidden" name="activity" value={activity} />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Title (optional)
        </label>
        <input name="title" maxLength={80} placeholder="Push day A" className="field" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              name="duration_min"
              type="number"
              min={1}
              max={600}
              required
              defaultValue={45}
              className="field font-mono tabular-nums"
            />
            <span className="text-xs text-ink-950/40">min</span>
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Calories (optional)
          </label>
          <input
            name="calories"
            type="number"
            min={0}
            placeholder="420"
            className="field font-mono tabular-nums"
          />
        </div>
      </div>

      {showDistance && (
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Distance (optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              name="distance_km"
              type="number"
              step="0.01"
              min={0}
              placeholder="5.2"
              className="field font-mono tabular-nums"
            />
            <span className="text-xs text-ink-950/40">km</span>
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Intensity: <span className="text-ink-950/80">1-10</span>
        </label>
        <input
          name="intensity"
          type="range"
          min={1}
          max={10}
          defaultValue={6}
          className="accent-ember-400"
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">How did it feel?</span>
        <div className="flex gap-1.5">
          {FEELINGS.map((f) => (
            <label
              key={f}
              className="flex-1 cursor-pointer rounded-lg border border-ink-950/8 bg-ink-950/3 px-2 py-1.5 text-center text-xs text-ink-950/60 transition has-checked:border-ember-400/50 has-checked:bg-ember-400/12 has-checked:text-ink-950 hover:border-ink-950/16"
            >
              <input type="radio" name="feeling" value={f} defaultChecked={f === "good"} className="sr-only" />
              <span aria-hidden className="mr-1">
                {FEELING_EMOJI[f]}
              </span>
              <span className="capitalize">{f}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Date</label>
        <input
          name="performed_on"
          type="date"
          required
          max={todayISO()}
          defaultValue={todayISO()}
          className="field"
        />
      </div>

      <Banner state={state} />
      <div>
        <Submit label="Save session" />
      </div>
    </form>
  );
}
