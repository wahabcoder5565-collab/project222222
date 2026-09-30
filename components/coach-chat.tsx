"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { askCoach, clearChatHistory } from "@/app/actions/ai";

type Turn = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why has my squat stalled?",
  "What is the most valuable thing I could change this week?",
  "Am I recovering enough for the volume I am doing?",
  "Should I adjust any of my goals?",
];

export function CoachChat({ initial }: { initial: Turn[] }) {
  const [turns, setTurns] = useState<Turn[]>(initial);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const seq = useRef(initial.length);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  const send = (question: string) => {
    const clean = question.trim();
    if (!clean || pending) return;

    const history = turns.slice(-6);
    seq.current += 1;
    const userTurn: Turn = { id: `t${seq.current}`, role: "user", content: clean };
    setTurns((t) => [...t, userTurn]);
    setInput("");
    setError(null);

    startTransition(async () => {
      const result = await askCoach(clean, history);
      seq.current += 1;
      if (result.ok) {
        setTurns((t) => [...t, { id: `t${seq.current}`, role: "assistant", content: result.answer }]);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="panel flex min-h-[32rem] flex-col overflow-hidden">
      <div className="hairline flex items-center justify-between gap-3 px-5 py-3.5">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-ink-950/40 uppercase">
          <span aria-hidden>✦</span>
          Grounded in your data
        </p>
        {turns.length > 0 && (
          <form action={clearChatHistory}>
            <button
              type="submit"
              className="rounded-lg border border-ink-950/10 px-2.5 py-1 text-[11px] text-ink-950/45 transition hover:border-ink-950/25 hover:text-ink-950"
            >
              Clear
            </button>
          </form>
        )}
      </div>

      <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {turns.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-950/55">
              Ask anything about your training. Every answer is grounded in the numbers
              already in your log — your rings, goals, lifts, sleep and streak.
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-ink-950/8 bg-ink-950/3 px-3 py-2.5 text-left text-xs text-ink-950/60 transition hover:border-ember-400/40 hover:bg-ember-400/8 hover:text-ink-950"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                turn.role === "user"
                  ? "bg-ember-400/15 text-ink-950"
                  : "border border-ink-950/8 bg-ink-950/4 text-ink-950/75"
              }`}
            >
              {turn.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-ink-950/8 bg-ink-950/4 px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-pulse rounded-full bg-ink-950/40"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="hairline flex items-center gap-2 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a plateau, a goal, or this week's training…"
          maxLength={800}
          className="field"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="shrink-0 rounded-xl bg-gradient-to-r from-ember-300 to-ember-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
