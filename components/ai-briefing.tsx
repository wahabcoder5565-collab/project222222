"use client";

import { useState, useTransition } from "react";

import { getDailyBriefing, type Briefing } from "@/app/actions/ai";
import { TONE_STYLES } from "@/lib/coach";

const TONE_LABEL: Record<Briefing["tone"], string> = {
  fire: "On fire",
  win: "Locked in",
  push: "Honest push",
  calm: "Steady",
};

export function AiBriefing({ initial }: { initial: Briefing | null }) {
  const [briefing, setBriefing] = useState<Briefing | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      setError(null);
      const result = await getDailyBriefing({ force: true });
      if (result.ok) setBriefing(result.briefing);
      else setError(result.error);
    });

  if (!briefing) {
    return (
      <div className="panel px-5 py-4">
        <p className="text-sm text-ink-950/45">
          The coach is unavailable right now.{" "}
          {error && <span className="text-rose-600">{error}</span>}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="mt-3 rounded-lg border border-ink-950/12 px-3 py-1.5 text-xs text-ink-950/60 transition hover:border-ink-950/25 hover:text-ink-950 disabled:opacity-50"
        >
          {pending ? "Trying…" : "Try again"}
        </button>
      </div>
    );
  }

  const tone = TONE_STYLES[briefing.tone];

  return (
    <div className="relative overflow-hidden rounded-4xl border border-ink-950/8 bg-ink-950/3 p-5 sm:p-6">
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-16 -right-10 size-56 rounded-full blur-3xl ${tone.glow}`}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-ink-950/40 uppercase">
            <span aria-hidden>✦</span>
            Gemini coach
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone.chip}`}
            >
              {TONE_LABEL[briefing.tone]}
            </span>
            <button
              type="button"
              onClick={refresh}
              disabled={pending}
              className="rounded-lg border border-ink-950/10 px-2.5 py-1 text-[11px] text-ink-950/50 transition hover:border-ink-950/25 hover:text-ink-950 disabled:opacity-50"
            >
              {pending ? "Reading your data…" : "Regenerate"}
            </button>
          </div>
        </div>

        <h2 className={`mt-3 text-2xl font-semibold tracking-tight ${tone.ring}`}>
          {briefing.headline}
        </h2>

        <dl className="mt-4 grid gap-3 text-sm leading-relaxed sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-ink-950/30 uppercase">
              What the data says
            </dt>
            <dd className="mt-1 text-ink-950/65">{briefing.read}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-ink-950/30 uppercase">
              Do this today
            </dt>
            <dd className="mt-1 text-ink-950/65">{briefing.focus}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold tracking-widest text-ink-950/30 uppercase">
              Why it matters
            </dt>
            <dd className="mt-1 text-ink-950/65">{briefing.nudge}</dd>
          </div>
        </dl>

        {briefing.question && (
          <p className="mt-4 border-t border-ink-950/7 pt-3 text-sm italic text-ink-950/45">
            {briefing.question}
          </p>
        )}

        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
