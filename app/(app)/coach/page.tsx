import { CoachChat } from "@/components/coach-chat";
import { ProgressRing } from "@/components/progress-ring";
import { getChatHistory } from "@/app/actions/ai";
import { isAiConfigured } from "@/lib/gemini";
import { getGoals, getStats } from "@/lib/data";
import { formatValue, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "AI Coach" };

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [history, stats, goals] = await Promise.all([
    getChatHistory(),
    getStats(userId),
    getGoals(userId),
  ]);

  const configured = isAiConfigured();
  const active = goals.filter((g) => !g.archived);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI coach</h1>
        <p className="mt-1 text-sm text-ink-950/45">
          A Gemini model reading your full training log — {stats.entries.toLocaleString()}{" "}
          entries, {stats.workouts} sessions, {stats.active_days} active days.
        </p>
      </div>

      {!configured && (
        <div className="rounded-2xl border border-flame-500/30 bg-flame-500/10 px-4 py-3 text-sm text-flame-800">
          <code>GEMINI_API_KEY</code> is not set on the server. Add it to{" "}
          <code>.env.local</code> and restart — it is never sent to the browser.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <CoachChat
          initial={history.map((m) => ({
            id: String(m.id),
            role: m.role as "user" | "assistant",
            content: m.content as string,
          }))}
        />

        <div className="grid content-start gap-4">
          <div className="panel flex items-center gap-4 p-5">
            <ProgressRing
              pct={stats.xp_for_level ? (stats.xp_into_level / stats.xp_for_level) * 100 : 0}
              size={70}
              thickness={4}
            >
              <div className="text-center leading-none">
                <p className="font-mono text-base font-semibold tabular-nums">{stats.level}</p>
                <p className="text-[8px] tracking-widest text-ink-950/40 uppercase">lvl</p>
              </div>
            </ProgressRing>
            <div className="min-w-0 text-sm">
              <p className="font-medium">What the model can see</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-950/45">
                {stats.streak}-day streak, {stats.workouts} sessions, {stats.workouts} badges, and{" "}
                {active.length} active goals. Every answer is constrained to these facts.
              </p>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold">Grounding rules</h2>
            <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-ink-950/45">
              {[
                "Only facts from your own rows — nothing is invented.",
                "No medical or injury diagnosis; it will defer to a professional.",
                "The daily briefing is generated once and cached for 24 hours.",
                "Chat turns are stored so you can re-read past advice.",
              ].map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="text-ember-700">
                    ·
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {active.length > 0 && (
            <div className="panel p-5">
              <h2 className="text-sm font-semibold">Goals in context</h2>
              <ul className="mt-3 grid gap-2.5">
                {active.slice(0, 4).map((g) => (
                  <li key={g.id} className="flex items-baseline gap-2 text-xs">
                    <span className="flex-1 truncate text-ink-950/60">{g.label}</span>
                    <span className="font-mono tabular-nums text-ink-950/40">
                      {Math.round(Number(g.pct))}%
                    </span>
                    <span className="font-mono tabular-nums text-ink-950/25">
                      {formatValue(Number(g.current_value ?? g.start_value))}
                      {g.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div className="panel p-5">
              <h2 className="text-sm font-semibold">Recent questions</h2>
              <ul className="mt-3 grid gap-2">
                {history
                  .filter((m) => m.role === "user")
                  .slice(-5)
                  .reverse()
                  .map((m) => (
                    <li key={m.id} className="truncate text-xs text-ink-950/45">
                      {m.content}
                      <span className="ml-1.5 text-ink-950/20">
                        {shortDate(String(m.created_at).slice(0, 10))}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
