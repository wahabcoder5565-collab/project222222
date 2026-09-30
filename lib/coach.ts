import type { Badge, Gauge, Goal, UserStats } from "./types";

export type Tone = "fire" | "win" | "push" | "calm";

export type Nudge = {
  headline: string;
  body: string;
  tone: Tone;
  cta?: { label: string; href: string };
};

/** Maps a badge rule to how far along the athlete is, using the stats JSON. */
export function badgeProgress(badge: Badge, stats: UserStats): { pct: number; remaining: number; unit: string } {
  const rule = ruleOf(badge);

  switch (rule.kind) {
    case "streak":
      return ratio(stats.streak, Number(rule.days), "days");
    case "workouts":
      return ratio(stats.workouts, Number(rule.count), "sessions");
    case "entries":
      return ratio(stats.entries, Number(rule.count), "entries");
    case "distinct_days":
      return ratio(stats.active_days, Number(rule.value), "days");
    case "active_minutes":
      return ratio(stats.workout_min, Number(rule.value), "min");
    case "metric": {
      const best = stats.prs[String(rule.key)] ?? 0;
      return ratio(best, Number(rule.value), badge.title);
    }
    case "goal_complete":
      return ratio(stats.goals_done, Number(rule.count ?? 1), "goals");
    case "goals_all_complete":
      return stats.goals_active === 0
        ? { pct: 100, remaining: 0, unit: "goals" }
        : { pct: 0, remaining: stats.goals_active, unit: "goals" };
    default:
      return { pct: 0, remaining: 1, unit: "" };
  }
}

function ratio(current: number, target: number, unit: string) {
  if (!target) return { pct: 100, remaining: 0, unit };
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  return {
    pct,
    remaining: Math.max(0, Math.ceil(target - current)),
    unit,
  };
}

function ruleOf(badge: Badge): Record<string, unknown> {
  return badge.rule as Record<string, unknown> | undefined ?? {};
}

/** The closest unearned badge, used for the "next unlock" teaser. */
export function nextBadge(badges: Badge[], stats: UserStats) {
  return badges
    .filter((b) => !b.earned_at)
    .map((b) => ({ badge: b, ...badgeProgress(b, stats) }))
    .sort((a, b) => b.pct - a.pct)[0];
}

/**
 * Picks the single most motivating thing to say right now. Ordered by
 * urgency: catch a missed log first, then celebrate, then nudge forward.
 */
export function coach(stats: UserStats, gauges: Gauge[], goals: Goal[]): Nudge {
  const open = gauges.filter((g) => g.pct > 0 && g.pct < 100);
  const missed = gauges.filter((g) => g.pct <= 0);
  const smashed = gauges.filter((g) => g.pct >= 100);
  const active = goals.filter((g) => !g.archived);

  if (missed.length > 0 && gauges.length > 0) {
    const worst = missed[0];
    return {
      headline: `${worst.label} is still wide open`,
      body:
        missed.length === 1
          ? "One entry keeps today's page clean. It takes ten seconds."
          : `${missed.length} rings are untouched today. The smallest one is the easiest place to restart momentum.`,
      tone: "push",
      cta: { label: "Log it now", href: `/log?metric=${worst.metric_key}` },
    };
  }

  if (smashed.length === gauges.length && gauges.length > 0) {
    return {
      headline: "Every ring closed today",
      body: `That is a full sweep — ${smashed.length} of ${gauges.length} targets met. ${stats.streak}-day streak and climbing.`,
      tone: "win",
    };
  }

  const near = [...open].sort((a, b) => b.pct - a.pct)[0];
  if (near && near.pct >= 80) {
    return {
      headline: `${near.label} is within reach`,
      body: `You are at ${Math.round(near.pct)}% of today's target. Push past ${near.target} and the ring closes.`,
      tone: "fire",
    };
  }

  const atRisk = active
    .filter((g) => g.days_left <= 21 && g.pct < 70)
    .sort((a, b) => a.days_left - b.days_left)[0];
  if (atRisk) {
    return {
      headline: `${atRisk.label} needs a decision`,
      body: `${atRisk.days_left} days left and ${Math.round(atRisk.pct)}% done. Either put a plan behind it or adjust the target — both are wins.`,
      tone: "push",
      cta: { label: "Review goals", href: "/goals" },
    };
  }

  const closest = [...active].sort((a, b) => b.pct - a.pct)[0];
  if (closest && closest.pct >= 60) {
    return {
      headline: `${closest.label} is ${Math.round(closest.pct)}% done`,
      body: `Current ${Number(closest.current_value ?? 0).toFixed(1)} ${closest.unit} against a ${closest.target_value} ${closest.unit} target. The hard part is already behind you.`,
      tone: "fire",
    };
  }

  if (stats.streak >= 3) {
    return {
      headline: `${stats.streak} days strong`,
      body: `You have trained ${stats.workouts} times for ${Math.round(stats.workout_min / 60)} hours. Consistency is the actual superpower.`,
      tone: "fire",
    };
  }

  return {
    headline: "Start the streak",
    body: "Log one metric and one session today. Tomorrow's version of you is built entirely out of what you do right now.",
    tone: "calm",
    cta: { label: "Log activity", href: "/log" },
  };
}

export const TONE_STYLES: Record<Tone, { ring: string; chip: string; glow: string }> = {
  fire: {
    ring: "text-flame-600",
    chip: "bg-flame-500/15 text-flame-600 border-flame-500/30",
    glow: "bg-flame-500/20",
  },
  win: {
    ring: "text-ember-700",
    chip: "bg-ember-400/15 text-ember-700 border-ember-400/30",
    glow: "bg-ember-400/20",
  },
  push: {
    ring: "text-sky-600",
    chip: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    glow: "bg-sky-500/20",
  },
  calm: {
    ring: "text-violet-600",
    chip: "bg-violet-500/15 text-violet-700 border-violet-500/30",
    glow: "bg-violet-500/20",
  },
};
