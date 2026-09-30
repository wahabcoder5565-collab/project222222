"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createGoal, type FormResult } from "@/app/actions/goals";
import { GOAL_COLORS } from "@/lib/format";
import type { Metric } from "@/lib/types";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-ember-300 to-ember-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create goal"}
    </button>
  );
}

export function CreateGoalForm({ metrics }: { metrics: Metric[] }) {
  const [state, action] = useActionState<FormResult, FormData>(createGoal, null);
  const [color, setColor] = useState<string>("emerald");
  const [direction, setDirection] = useState<"higher" | "lower">("higher");
  const [metricId, setMetricId] = useState<string>("");

  const selected = metrics.find((m) => String(m.id) === metricId);
  const suggestedLabel = selected
    ? direction === "higher"
      ? `Hit ${selected.unit}`
      : `Get down to`
    : "";

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Track a metric (optional)
        </label>
        <select
          value={metricId}
          onChange={(e) => setMetricId(e.target.value)}
          className="field"
        >
          <option value="">Manual goal — I&apos;ll track it myself</option>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} ({m.unit})
            </option>
          ))}
        </select>
        {metricId && <input type="hidden" name="metric_id" value={metricId} />}
        <p className="text-[11px] text-ink-950/30">
          Linking a metric fills progress from your logs automatically.
        </p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Direction</span>
        <div className="grid grid-cols-2 gap-1.5">
          {(["higher", "lower"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                direction === d
                  ? "border-ember-400/50 bg-ember-400/12 text-ink-950"
                  : "border-ink-950/8 bg-ink-950/3 text-ink-950/55 hover:border-ink-950/16"
              }`}
            >
              {d === "higher" ? "↑ Build it up" : "↓ Get it down"}
            </button>
          ))}
        </div>
        <input type="hidden" name="direction" value={direction} />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
          Goal name
        </label>
        <input
          name="label"
          required
          minLength={3}
          maxLength={80}
          placeholder={selected ? suggestedLabel : "Bench press 100 kg"}
          defaultValue={selected ? suggestedLabel : ""}
          key={`${metricId}-${direction}`}
          className="field"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            Start
          </label>
          <input
            name="start_value"
            type="number"
            step="any"
            required
            placeholder="58"
            className="field font-mono tabular-nums"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Target</label>
          <input
            name="target_value"
            type="number"
            step="any"
            required
            placeholder="100"
            className="field font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Unit</label>
          <input
            name="unit"
            maxLength={12}
            defaultValue={selected?.unit ?? "kg"}
            key={`unit-${metricId}`}
            className="field"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
            By when
          </label>
          <input name="target_date" type="date" required className="field" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">Colour</span>
        <div className="flex gap-1.5">
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={`size-7 rounded-lg border-2 transition ${
                color === c ? "border-ink-950" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              style={{ background: GOAL_SWATCH[c] }}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </div>

      {state && "error" in state && (
        <p
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
        >
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-xl border border-ember-400/30 bg-ember-400/10 px-3 py-2 text-sm text-ember-800">
          Goal created.
        </p>
      )}

      <Submit />
    </form>
  );
}

const GOAL_SWATCH: Record<string, string> = {
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
  sky: "#38bdf8",
  rose: "#fb7185",
  lime: "#a3e635",
};
