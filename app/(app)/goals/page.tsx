import { archiveGoal } from "@/app/actions/goals";
import { CreateGoalForm } from "@/components/goal-form";
import { ProgressRing } from "@/components/progress-ring";
import { SectionTitle } from "@/components/ui";
import { GOAL_ACCENT, accentInk, formatValue } from "@/lib/format";
import { getGoals, getStats, listMetrics } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [goals, metrics, stats] = await Promise.all([
    getGoals(userId),
    listMetrics(),
    getStats(userId),
  ]);

  const active = goals.filter((g) => !g.archived);
  const done = goals.filter((g) => g.archived);
  const byKey = new Map(metrics.map((m) => [m.key, m]));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-ink-950/45">
          {stats.goals_done} completed · {stats.goals_active} in play
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle title="In play" sub="Progress fills from your latest logged value." />

          {active.length === 0 ? (
            <div className="panel px-6 py-14 text-center">
              <p className="text-4xl" aria-hidden>
                🎯
              </p>
              <h3 className="mt-3 text-base font-semibold">No goals yet</h3>
              <p className="mt-1.5 text-sm text-ink-950/45">
                A goal turns a number you want to change into a number you can watch move.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {active.map((goal) => {
                const accent = GOAL_ACCENT[goal.color] ?? "#34d399";
                const metric = goal.metric_key ? byKey.get(goal.metric_key) : undefined;
                const urgent = goal.days_left <= 14 && Number(goal.pct) < 80;
                return (
                  <li key={goal.id} className="panel panel-hover p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <ProgressRing pct={Number(goal.pct)} size={70} thickness={5} accent={accent}>
                        <span
                          className="font-mono text-sm font-semibold tabular-nums"
                          style={{ color: accentInk(accent) }}
                        >
                          {Math.round(Number(goal.pct))}%
                        </span>
                      </ProgressRing>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{goal.label}</h3>
                          {metric && (
                            <span className="rounded-md bg-ink-950/6 px-1.5 py-0.5 text-[10px] text-ink-950/45">
                              auto · {metric.icon} {metric.label}
                            </span>
                          )}
                          {urgent && (
                            <span className="rounded-md border border-flame-500/30 bg-flame-500/12 px-1.5 py-0.5 text-[10px] font-medium text-flame-600">
                              needs attention
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-ink-950/45">
                          <span className="tabular-nums">
                            {formatValue(Number(goal.start_value))} →{" "}
                            {formatValue(Number(goal.target_value))} {goal.unit}
                          </span>
                          <span className="mx-1.5 text-ink-950/20">·</span>
                          now{" "}
                          <span className="tabular-nums text-ink-950/70">
                            {formatValue(Number(goal.current_value ?? goal.start_value))} {goal.unit}
                          </span>
                        </p>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-950/8">
                          <div
                            className="h-full rounded-full transition-[width] duration-1000"
                            style={{
                              width: `${Math.max(1.5, Number(goal.pct))}%`,
                              background: `linear-gradient(90deg, ${accent}99, ${accent})`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className={urgent ? "text-flame-600" : "text-ink-950/40"}>
                            {goal.days_left > 0
                              ? `${goal.days_left} days left`
                              : "past the target date"}
                          </span>
                          <form action={archiveGoal}>
                            <input type="hidden" name="id" value={goal.id} />
                            <button
                              type="submit"
                              className="text-ink-950/30 transition hover:text-ink-950/70"
                            >
                              Archive
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {done.length > 0 && (
            <div className="mt-8">
              <SectionTitle title="Archived" />
              <ul className="panel divide-y divide-ink-950/6">
                {done.map((goal) => (
                  <li key={goal.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span aria-hidden className="text-ember-700">
                      ✓
                    </span>
                    <span className="flex-1 truncate text-sm text-ink-950/50 line-through">
                      {goal.label}
                    </span>
                    <span className="font-mono text-xs text-ink-950/35 tabular-nums">
                      {formatValue(Number(goal.target_value))} {goal.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <SectionTitle title="New goal" sub="Name it, anchor it, date it." />
          <div className="panel p-5">
            <CreateGoalForm metrics={metrics} />
          </div>
        </section>
      </div>
    </div>
  );
}
