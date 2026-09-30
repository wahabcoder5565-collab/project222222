import "server-only";

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
} from "./data";
import { addDaysISO, compact, formatValue, todayISO } from "./format";
import type { UserStats } from "./types";

export type CoachContext = {
  name: string;
  focus: string;
  today: string;
  stats: UserStats;
  rings: string;
  goals: string;
  body: string;
  strength: string;
  cardio: string;
  recovery: string;
  week: string;
  recentSessions: string;
  nextBadge: string;
};

const num = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "n/a" : Number(v).toFixed(digits);

/** Compares the first and last third of a series to describe the trend. */
function trend(series: { value: number }[]): string {
  if (series.length < 4) return "not enough history";
  const values = series.map((s) => Number(s.value));
  const cut = Math.max(1, Math.floor(values.length / 3));
  const early = values.slice(0, cut);
  const late = values.slice(-cut);
  const mean = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const delta = mean(late) - mean(early);
  if (Math.abs(delta) < 0.001) return "flat";
  return `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)}`;
}

function seriesLine(
  label: string,
  series: { day: string; value: number }[],
  unit: string,
): string {
  if (!series.length) return `- ${label}: no entries yet`;
  const values = series.map((s) => Number(s.value));
  return `- ${label}: latest ${num(values.at(-1))}${unit} (${series.at(-1)!.day}), ${trend(series)}, best ${
    unit === "min" ? "n/a" : num(Math.max(...values))
  }${unit}, entries ${series.length}`;
}

/**
 * Builds a compact, factual snapshot. Deliberately numbers-only: the model
 * reasons about these, so no interpretation is pre-baked into the prompt.
 */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const today = todayISO();
  const monthAgo = addDaysISO(today, -29);
  const week = defaultRange(7);

  const [profile, stats, gauges, goals, metrics, badges, workouts, activity, body, cardio, recovery] =
    await Promise.all([
      getProfile(userId),
      getStats(userId),
      getGauges(userId, today),
      getGoals(userId),
      listMetrics(),
      getBadges(userId),
      getWorkouts(userId, 6),
      getActivity(userId, week.from, week.to),
      Promise.all([
        getSeries(userId, "weight_kg", monthAgo, today),
        getSeries(userId, "body_fat_pct", monthAgo, today),
        getSeries(userId, "waist_cm", monthAgo, today),
      ]),
      Promise.all([
        getSeries(userId, "run_5k_min", monthAgo, today),
        getSeries(userId, "vo2max", monthAgo, today),
        getSeries(userId, "bench_press", monthAgo, today),
        getSeries(userId, "squat", monthAgo, today),
        getSeries(userId, "deadlift", monthAgo, today),
      ]),
      Promise.all([
        getSeries(userId, "sleep_h", week.from, week.to),
        getSeries(userId, "resting_hr", monthAgo, today),
        getSeries(userId, "recovery_pct", week.from, week.to),
        getSeries(userId, "water_l", week.from, week.to),
        getSeries(userId, "protein_g", week.from, week.to),
      ]),
    ]);

  void metrics;

  const weekMinutes = activity.reduce((n, a) => n + Number(a.active_min ?? 0), 0);
  const weekSessions = activity.reduce((n, a) => n + a.workouts, 0);
  const restDays = activity.filter((a) => a.workouts === 0 && a.entries === 0).length;

  const active = goals.filter((g) => !g.archived);
  const upcoming = badges
    .filter((b) => !b.earned_at)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 3);

  return {
    name: profile?.display_name?.split(" ")[0] ?? "Athlete",
    focus: profile?.goal_focus?.trim() || "not set",
    today,
    stats,
    rings: gauges
      .map(
        (g) =>
          `- ${g.label}: ${formatValue(Number(g.value))}/${formatValue(Number(g.target))} ${g.unit} (${Math.round(
            Number(g.pct),
          )}%)`,
      )
      .join("\n"),
    goals:
      active.length > 0
        ? active
            .map(
              (g) =>
                `- ${g.label}: ${formatValue(Number(g.current_value ?? g.start_value))}/${formatValue(
                  Number(g.target_value),
                )} ${g.unit} = ${Math.round(Number(g.pct))}%, ${g.days_left} days left (${g.direction})`,
            )
            .join("\n")
        : "none set",
    body: [
      seriesLine("Weight", body[0], " kg"),
      seriesLine("Body fat", body[1], "%"),
      seriesLine("Waist", body[2], " cm"),
    ].join("\n"),
    strength: [
      seriesLine("Bench press", cardio[2], " kg"),
      seriesLine("Squat", cardio[3], " kg"),
      seriesLine("Deadlift", cardio[4], " kg"),
    ].join("\n"),
    cardio: [
      seriesLine("5K time", cardio[0], " min"),
      seriesLine("VO2 max", cardio[1], ""),
    ].join("\n"),
    recovery: [
      seriesLine("Sleep (7d)", recovery[0], " h"),
      seriesLine("Resting HR (30d)", recovery[1], " bpm"),
      seriesLine("Recovery (7d)", recovery[2], "%"),
      seriesLine("Water (7d)", recovery[3], " L"),
      seriesLine("Protein (7d)", recovery[4], " g"),
    ].join("\n"),
    week: `${weekSessions} sessions, ${Math.round(weekMinutes)} active minutes, ${restDays} rest days in the last 7`,
    recentSessions:
      workouts.length > 0
        ? workouts
            .map(
              (w) =>
                `- ${w.performed_on}: ${w.activity} ${w.duration_min}min, intensity ${w.intensity}/10, feeling ${w.feeling ?? "n/a"}`,
            )
            .join("\n")
        : "none logged",
    nextBadge: upcoming.map((b) => `${b.title} (${b.description})`).join("; ") || "all earned",
  };
}

export function contextToPrompt(ctx: CoachContext): string {
  return [
    `TODAY: ${ctx.today}`,
    `ATHLETE: ${ctx.name}. Stated focus: ${ctx.focus}.`,
    "",
    "TODAY'S RINGS (daily targets):",
    ctx.rings,
    "",
    "ACTIVE GOALS:",
    ctx.goals,
    "",
    "LAST 7 DAYS:",
    ctx.week,
    "",
    "RECENT SESSIONS:",
    ctx.recentSessions,
    "",
    "BODY COMPOSITION (30 days):",
    ctx.body,
    "",
    "STRENGTH (30 days):",
    ctx.strength,
    "",
    "CARDIO (30 days):",
    ctx.cardio,
    "",
    "RECOVERY & NUTRITION:",
    ctx.recovery,
    "",
    "LIFETIME:",
    `- level ${ctx.stats.level}, ${ctx.stats.xp} XP`,
    `- current streak ${ctx.stats.streak} days, best ${ctx.stats.best_streak}`,
    `- ${ctx.stats.active_days} active days, ${ctx.stats.workouts} sessions, ${compact(
      ctx.stats.workout_min,
    )} min trained`,
    `- ${ctx.stats.entries} metric entries, ${ctx.stats.badges} badges earned`,
    `- goals: ${ctx.stats.goals_done} completed, ${ctx.stats.goals_active} active`,
    "",
    `UNLOCKABLE BADGES: ${ctx.nextBadge}`,
  ].join("\n");
}
