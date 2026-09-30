"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { logEntry, type FormResult } from "@/app/actions/data";
import { accentFor, accentInk, todayISO } from "@/lib/format";
import type { Gauge, Metric } from "@/lib/types";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink-950/6 px-3.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-ink-950/12 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

function Stepper({
  metric,
  onChange,
}: {
  metric: Metric & { value: number };
  onChange: (next: number) => void;
}) {
  const step = Number(metric.step) || 1;
  const bigStep = step * 5;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(-step)}
        className="size-8 rounded-lg border border-ink-950/10 text-ink-950/60 transition hover:bg-ink-950/6 hover:text-ink-950"
        aria-label={`Decrease ${metric.label}`}
      >
        −
      </button>
      <input
        name="value"
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        required
        value={Number.isFinite(metric.value) ? metric.value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field w-24 text-center font-mono tabular-nums"
      />
      <button
        type="button"
        onClick={() => onChange(step)}
        className="size-8 rounded-lg border border-ink-950/10 text-ink-950/60 transition hover:bg-ink-950/6 hover:text-ink-950"
        aria-label={`Increase ${metric.label}`}
      >
        +
      </button>
      <button
        type="button"
        onClick={() => onChange(bigStep)}
        className="rounded-lg border border-ink-950/10 px-2 py-1.5 text-[11px] text-ink-950/45 transition hover:bg-ink-950/6 hover:text-ink-950"
      >
        +{bigStep}
      </button>
      <span className="ml-1 text-xs text-ink-950/40">{metric.unit}</span>
    </div>
  );
}

/**
 * One tap to open a metric, arrows to adjust, save to log. Each submit
 * re-runs the badge rules, so earning a badge is visible immediately.
 */
export function QuickLog({ metrics, gauges }: { metrics: Metric[]; gauges: Gauge[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [state, formAction] = useActionState<FormResult, FormData>(logEntry, null);

  const newBadges = state && "ok" in state ? (state.newBadges ?? []) : [];

  const valueFor = (metric: Metric) => {
    if (draft[metric.key] !== undefined) return draft[metric.key];
    const gauge = gauges.find((g) => g.metric_key === metric.key);
    return gauge ? Number(gauge.value) : 0;
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => {
          const gauge = gauges.find((g) => g.metric_key === metric.key);
          const pct = gauge?.pct ?? 0;
          const active = open === metric.key;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => {
                setOpen(active ? null : metric.key);
                setDraft((d) => {
                  const next = { ...d };
                  delete next[metric.key];
                  return next;
                });
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? "border-ember-400/50 bg-ember-400/10 text-ink-950"
                  : "border-ink-950/8 bg-ink-950/3 text-ink-950/60 hover:border-ink-950/16 hover:text-ink-950"
              }`}
            >
              <span aria-hidden>{metric.icon}</span>
              {metric.label}
              {pct >= 100 && (
                <span aria-hidden className="text-ember-700">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <form
          action={formAction}
          key={open}
          className="panel flex flex-wrap items-center gap-3 p-3.5"
        >
          {(() => {
            const metric = metrics.find((m) => m.key === open);
            if (!metric) return null;
            return (
              <>
                <input type="hidden" name="metric_id" value={metric.id} />
                <input type="hidden" name="entry_date" value={todayISO()} />
                <Stepper
                  metric={{ ...metric, value: valueFor(metric) }}
                  onChange={(next) =>
                    setDraft((d) => ({ ...d, [metric.key]: Math.max(0, next) }))
                  }
                />
                <span
                  className="rounded-lg px-2 py-1 text-[11px] font-medium"
                  style={{
                    background: `${accentFor(metric)}1a`,
                    color: accentInk(accentFor(metric)),
                  }}
                >
                  {metric.unit}
                </span>
                <SaveButton label="Log it" />
              </>
            );
          })()}
        </form>
      )}

      {state && "error" in state && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}

      {newBadges.length > 0 && (
        <p className="animate-rise text-sm font-medium text-ember-700">
          ✦ New achievement unlocked —{" "}
          <Link href="/achievements" className="underline underline-offset-2">
            see it
          </Link>
          .
        </p>
      )}
    </div>
  );
}
