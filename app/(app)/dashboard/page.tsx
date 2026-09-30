import Link from "next/link";

import { ActivityHeatmap } from "@/components/activity-heatmap";
import { AiBriefing } from "@/components/ai-briefing";
import { ProgressRing } from "@/components/progress-ring";
import { QuickLog } from "@/components/quick-log";
import { RingGauge } from "@/components/ring-gauge";
import { StatTile } from "@/components/stat-tile";
import { Kicker, SectionTitle, StreakFlame } from "@/components/ui";
import { TONE_STYLES, coach, nextBadge } from "@/lib/coach";
import {
  defaultRange,
  getActivity,
  getBadges,
  getGauges,
  getGoals,
  getProfile,
  getSeries,
  getStats,
  getWorkouts,
  listMetrics,
} from "@/lib/data";
import {
  METRIC_ACCENT,
  accentFor,
  accentInk,
  addDaysISO,
  compact,
  formatValue,
  greeting,
  shortDate,
  todayISO,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getDailyBriefing } from "@/app/actions/ai";

export const metadata = { title: "Today" };

const WINDOW = 182;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;
  const params = await searchParams;

  const today = todayISO();
  const from = addDaysISO(today, -(WINDOW - 1));
  const week = defaultRange(7);

  const [profile, stats, gauges, metrics, goals, badges, workouts, activity, weightSeries, stepSeries, ai] =
    await Promise.all([
      getProfile(userId),
      getStats(userId),
      getGauges(userId, today),
      listMetrics(),
      getGoals(userId),
      getBadges(userId),
      getWorkouts(userId, 5),
      getActivity(userId, from, today),
      getSeries(userId, "weight_kg", addDaysISO(today, -29), today),
      getSeries(userId, "steps", week.from, week.to),
      getDailyBriefing(),
    ]);

  const name = profile?.display_name?.split(" ")[0] ?? "Athlete";
  const message = coach(stats, gauges, goals);
  const tone = TONE_STYLES[message.tone];
  const upcoming = nextBadge(badges, stats);

  const dailyMetrics = metrics.filter((m) => m.is_daily);
  const levelPct = stats.xp_for_level
    ? (stats.xp_into_level / stats.xp_for_level) * 100
    : 0;

  const thisWeek = activity.filter((a) => a.day >= week.from);
  const weekWorkouts = thisWeek.reduce((n, a) => n + a.workouts, 0);
  const weekMinutes = thisWeek.reduce((n, a) => n + Number(a.active_min ?? 0), 0);
  const weekCalories = thisWeek.reduce((n, a) => n + Number(a.calories ?? 0), 0);

  const last7 = stepSeries.slice(-7).reduce((n, p) => n + Number(p.value), 0);
  const prev7 = stepSeries.slice(0, 7).reduce((n, p) => n + Number(p.value), 0);

  const weightNow = weightSeries.at(-1)?.value;
  const weightThen = weightSeries[0]?.value;
  const weightDelta =
    weightNow !== undefined && weightThen !== undefined ? Number(weightNow) - Number(weightThen) : null;

  const activeGoals = goals.filter((g) => !g.archived).slice(0, 3);
  const heatCells = activity
    .filter((a) => Number(a.intensity) > 0 || a.entries > 0)
    .map((a) => ({ day: a.day, value: Number(a.intensity) }));

  const prEntries = Object.entries(stats.prs)
    .filter(([key]) => metrics.some((m) => m.key === key))
    .map(([key, value]) => ({ metric: metrics.find((m) => m.key === key)!, value }))
    .filter((r) =>
      ["bench_press", "squat", "deadlift", "run_5k_min", "vo2max", "pullups"].includes(
        r.metric.key,
      ),
    );

  return (
    <div className="grid gap-8">
      {params.welcome && (
        <div className="panel animate-rise flex items-center gap-3 border-ember-400/25 bg-ember-400/8 p-4">
          <span aria-hidden className="text-2xl">
            🎉
          </span>
          <p className="text-sm">
            Account created. Log your first metric below and the streak counter starts
            <span className="font-semibold text-ember-700"> today</span>.
          </p>
        </div>
      )}

      {/* Hero ------------------------------------------------------------- */}
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className={`pointer-events-none absolute -top-24 -right-16 size-80 rounded-full blur-3xl ${tone.glow}`}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Kicker>
              {greeting()}, {name}
            </Kicker>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {message.headline}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-950/55">
              {message.body}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {message.cta && (
                <Link
                  href={message.cta.href}
                  className="rounded-xl bg-ink-950/6 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-ink-950/12"
                >
                  {message.cta.label}
                </Link>
              )}
              <Link
                href="/coach"
                className="rounded-xl border border-ink-950/12 px-4 py-2 text-sm font-medium text-ink-950/75 transition hover:border-ink-950/25 hover:text-ink-950"
              >
                Ask the AI coach
              </Link>
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.chip}`}
              >
                {message.tone === "fire"
                  ? "🔥 On fire"
                  : message.tone === "win"
                    ? "✦ Nailed it"
                    : message.tone === "push"
                      ? "→ Keep moving"
                      : "◌ Take it steady"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <StreakFlame days={stats.streak} size={54} />
              <p className="font-mono text-2xl leading-none font-semibold tabular-nums">
                {stats.streak}
              </p>
              <p className="text-[11px] tracking-wide text-ink-950/40 uppercase">
                day streak
              </p>
              {stats.best_streak > stats.streak && (
                <p className="text-[10px] text-ink-950/30">best {stats.best_streak}</p>
              )}
            </div>

            <ProgressRing pct={levelPct} size={78} thickness={4} accent="#a3e635">
              <div className="text-center leading-none">
                <p className="font-mono text-lg font-semibold tabular-nums">{stats.level}</p>
                <p className="text-[8px] tracking-widest text-ink-950/40 uppercase">lvl</p>
              </div>
            </ProgressRing>
          </div>
        </div>

        <div className="relative mt-6">
          <div className="mb-1.5 flex justify-between text-[11px] text-ink-950/40">
            <span>
              {stats.xp_into_level.toLocaleString()} / {stats.xp_for_level.toLocaleString()} XP to
              level {stats.level + 1}
            </span>
            <span className="tabular-nums">{stats.xp.toLocaleString()} total</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-950/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-400 to-ember-300 shadow-[0_0_12px_var(--color-ember-400)] transition-[width] duration-1000"
              style={{ width: `${Math.max(1.5, levelPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* AI coach briefing ------------------------------------------------ */}
      {ai.ok ? (
        <AiBriefing initial={ai.briefing} />
      ) : (
        <div className="panel px-5 py-4 text-sm text-ink-950/45">{ai.error}</div>
      )}

      {/* Today's rings ---------------------------------------------------- */}
      <section>
        <SectionTitle
          title="Today's rings"
          sub="Six targets. Fill them all to close the day."
          action={
            <Link href="/log" className="text-sm font-medium text-ember-700 hover:underline">
              Log a workout →
            </Link>
          }
        />
        <div className="panel grid grid-cols-2 gap-x-4 gap-y-8 p-6 sm:grid-cols-3 xl:grid-cols-6">
          {gauges.map((g) => {
            const metric = metrics.find((m) => m.key === g.metric_key);
            return (
              <RingGauge
                key={g.metric_key}
                pct={Number(g.pct)}
                label={g.label}
                icon={g.icon}
                value={formatValue(Number(g.value))}
                unit={g.unit}
                accent={METRIC_ACCENT[g.metric_key] ?? "#a3e635"}
                caption={`${formatValue(Number(g.value))} / ${formatValue(Number(g.target))} ${g.unit}`}
                size={132}
                thickness={10}
                sublabel={
                  metric ? (
                    <span className="text-[10px] text-ink-950/30">#{metric.category}</span>
                  ) : null
                }
              />
            );
          })}
        </div>
      </section>

      {/* Quick log -------------------------------------------------------- */}
      <section>
        <SectionTitle title="Quick log" sub="Pick a ring and dial it in." />
        <div className="panel p-4 sm:p-5">
          <QuickLog metrics={dailyMetrics} gauges={gauges} />
        </div>
      </section>

      {/* Week at a glance ------------------------------------------------- */}
      <section>
        <SectionTitle title="This week" sub="Monday-to-date versus your own baseline." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Sessions"
            icon="🏋"
            accent="#a3e635"
            value={String(weekWorkouts)}
            unit="logged"
            trend={thisWeek.map((a) => ({ day: a.day, value: a.workouts }))}
          />
          <StatTile
            label="Active time"
            icon="⏱"
            accent="#38bdf8"
            value={compact(weekMinutes)}
            unit="min"
            trend={thisWeek.map((a) => ({ day: a.day, value: Number(a.active_min) }))}
          />
          <StatTile
            label="Calories"
            icon="🔥"
            accent="#fb923c"
            value={compact(weekCalories)}
            unit="kcal"
            trend={thisWeek.map((a) => ({ day: a.day, value: Number(a.calories) }))}
          />
          <StatTile
            label="Steps"
            icon="👟"
            accent="#22d3ee"
            value={compact(last7)}
            unit="avg/day"
            delta={prev7 ? ((last7 - prev7) / prev7) * 100 : null}
            deltaLabel="vs the days before"
            trend={stepSeries}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* Goals ---------------------------------------------------------- */}
        <section>
          <SectionTitle
            title="Goal progress"
            sub="Live against your latest logged value."
            action={
              <Link href="/goals" className="text-sm font-medium text-ember-700 hover:underline">
                All goals →
              </Link>
            }
          />
          {activeGoals.length === 0 ? (
            <div className="panel p-6 text-sm text-ink-950/45">
              No active goals yet.{" "}
              <Link href="/goals" className="text-ember-700 hover:underline">
                Set your first one
              </Link>
              .
            </div>
          ) : (
            <ul className="grid gap-3">
              {activeGoals.map((goal) => (
                <li key={goal.id} className="panel panel-hover flex items-center gap-4 p-4">
                  <ProgressRing
                    pct={Number(goal.pct)}
                    size={58}
                    thickness={5}
                    accent={goalAccent(goal.color)}
                  >
                    <span className="font-mono text-[11px] font-semibold tabular-nums">
                      {Math.round(Number(goal.pct))}
                    </span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{goal.label}</p>
                    <p className="mt-0.5 text-xs text-ink-950/45">
                      <span className="tabular-nums">
                        {formatValue(Number(goal.current_value ?? 0))} / {goal.target_value}{" "}
                        {goal.unit}
                      </span>
                      <span className="mx-1.5 text-ink-950/20">·</span>
                      {goal.days_left > 0
                        ? `${goal.days_left} days left`
                        : "past target date"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent sessions ------------------------------------------------- */}
        <section>
          <SectionTitle
            title="Recent sessions"
            action={
              <Link href="/progress" className="text-sm font-medium text-ember-700 hover:underline">
                Trends →
              </Link>
            }
          />
          {workouts.length === 0 ? (
            <div className="panel p-6 text-sm text-ink-950/45">Nothing logged yet.</div>
          ) : (
            <ul className="grid gap-2">
              {workouts.map((w) => (
                <li key={w.id} className="panel flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-sm"
                    style={{ background: `${activityAccent(w.activity)}1f`, color: activityAccent(w.activity) }}
                  >
                    {activityIcon(w.activity)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.title ?? w.activity}</p>
                    <p className="text-xs text-ink-950/40">
                      {shortDate(w.performed_on)} · {w.duration_min} min · intensity {w.intensity}/10
                    </p>
                  </div>
                  {w.calories ? (
                    <span className="font-mono text-xs text-ink-950/50 tabular-nums">
                      {compact(w.calories)} kcal
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* Heatmap -------------------------------------------------------- */}
        <section>
          <SectionTitle
            title="Consistency"
            sub="Every day with logged activity. Rest days are the plan, not a failure."
          />
          <div className="panel p-5">
            <ActivityHeatmap days={heatCells} />
            <div className="mt-4 flex items-center gap-4 text-[11px] text-ink-950/35">
              <span className="flex items-center gap-1.5">
                Less
                {["bg-ink-950/6", "bg-ember-500/25", "bg-ember-400/45", "bg-ember-400/70", "bg-ember-300"].map(
                  (c) => (
                    <span key={c} className={`size-[11px] rounded-[3px] ${c}`} />
                  ),
                )}
                More
              </span>
              <span className="ml-auto tabular-nums">
                {stats.active_days} active days total
              </span>
            </div>
          </div>
        </section>

        {/* Next badge + PRs ---------------------------------------------- */}
        <section className="grid content-start gap-8">
          {upcoming && (
            <div>
              <SectionTitle title="Next unlock" />
              <div className="panel p-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-xl border border-dashed border-ink-950/15 text-xl opacity-60"
                  >
                    {upcoming.badge.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{upcoming.badge.title}</p>
                    <p className="text-xs text-ink-950/40">{upcoming.badge.description}</p>
                  </div>
                  <span className="font-mono text-xs text-flame-600 tabular-nums">
                    +{upcoming.badge.xp}
                  </span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-950/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-flame-500 to-flame-400"
                    style={{ width: `${Math.max(2, upcoming.pct)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-950/40">
                  {upcoming.remaining > 0
                    ? `${upcoming.remaining} more ${upcoming.unit} to go — ${Math.round(upcoming.pct)}% there.`
                    : "Ready to claim."}
                </p>
              </div>
            </div>
          )}

          {prEntries.length > 0 && (
            <div>
              <SectionTitle title="Personal bests" sub="Your strongest numbers." />
              <ul className="panel divide-y divide-ink-950/6">
                {prEntries.map(({ metric, value }) => (
                  <li key={metric.key} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="text-base">
                      {metric.icon}
                    </span>
                    <span className="flex-1 text-sm text-ink-950/70">{metric.label}</span>
                    <span
                      className="font-mono text-sm font-semibold tabular-nums"
                      style={{ color: accentInk(accentFor(metric)) }}
                    >
                      {formatValue(value)} {metric.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {weightDelta !== null && (
        <p className="text-center text-xs text-ink-950/30">
          Body weight across the last 30 days:{" "}
          <span className={weightDelta <= 0 ? "text-ember-700" : "text-rose-600"}>
            {weightDelta > 0 ? "+" : ""}
            {weightDelta.toFixed(1)} kg
          </span>
        </p>
      )}
    </div>
  );
}

function goalAccent(color: string) {
  return (
    { emerald: "#34d399", violet: "#a78bfa", amber: "#fbbf24", sky: "#38bdf8", rose: "#fb7185", lime: "#a3e635" }[
      color
    ] ?? "#34d399"
  );
}

function activityIcon(activity: string) {
  return (
    {
      Strength: "🏋️",
      Run: "🏃",
      Cycle: "🚴",
      Swim: "🏊",
      Row: "🚣",
      HIIT: "⚡",
      Yoga: "🧘",
      Walk: "🚶",
      Sport: "⚽",
    }[activity] ?? "💪"
  );
}

function activityAccent(activity: string) {
  return (
    {
      Strength: "#34d399",
      Run: "#38bdf8",
      Cycle: "#c084fc",
      Swim: "#22d3ee",
      Row: "#60a5fa",
      HIIT: "#fb923c",
      Yoga: "#a78bfa",
      Walk: "#a3e635",
      Sport: "#fbbf24",
    }[activity] ?? "#34d399"
  );
}
