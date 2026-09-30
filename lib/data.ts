import "server-only";

import { cache } from "react";

import { createClient } from "./supabase/server";
import { addDaysISO, todayISO } from "./format";
import type {
  Badge,
  DailyActivity,
  Gauge,
  Goal,
  Metric,
  Profile,
  SeriesPoint,
  UserStats,
  Workout,
} from "./types";

/**
 * Every read goes through a request-scoped Supabase client that is built from
 * the user's cookies, and RLS scopes each query to `auth.uid()`. The
 * `p_user` argument is always `auth.uid()` — never something from the form.
 */

export const EMPTY_STATS: UserStats = {
  xp: 0,
  level: 1,
  xp_into_level: 0,
  xp_for_level: 50,
  badge_xp: 0,
  badges: 0,
  streak: 0,
  best_streak: 0,
  active_days: 0,
  workouts: 0,
  workout_min: 0,
  workout_kcal: 0,
  entries: 0,
  goals_active: 0,
  goals_done: 0,
  prs: {},
};

export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const listMetrics = cache(async (): Promise<Metric[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fit_metrics")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Metric[];
});

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fit_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile) ?? null;
});

export async function getStats(userId: string): Promise<UserStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fit_user_stats", { p_user: userId });
  if (error) throw error;
  return { ...EMPTY_STATS, ...(data as UserStats) };
}

/** Falls back to zero-valued gauges so a brand-new account still renders. */
export async function getGauges(userId: string, day = todayISO()): Promise<Gauge[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fit_daily_gauges", { p_user: userId, p_day: day });
  if (data && data.length) return data as Gauge[];

  const profile = await getProfile(userId);
  const metrics = await listMetrics();
  return metrics
    .filter((m) => m.is_daily)
    .map((m) => {
      const target = Number(profile?.daily_targets?.[m.key] ?? m.default_target ?? 100);
      return {
        metric_key: m.key,
        label: m.label,
        unit: m.unit,
        icon: m.icon,
        direction: m.direction,
        value: 0,
        target,
        pct: 0,
      } satisfies Gauge;
    });
}

export async function getActivity(
  userId: string,
  from: string,
  to: string,
): Promise<DailyActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fit_daily_activity", {
    p_user: userId,
    p_from: from,
    p_to: to,
  });
  return (data ?? []) as DailyActivity[];
}

export async function getSeries(
  userId: string,
  metricKey: string,
  from: string,
  to: string,
): Promise<SeriesPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fit_metric_series", {
    p_user: userId,
    p_metric: metricKey,
    p_from: from,
    p_to: to,
  });
  return (data ?? []) as SeriesPoint[];
}

export async function getSeriesBulk(
  userId: string,
  metricKeys: string[],
  from: string,
  to: string,
): Promise<Record<string, SeriesPoint[]>> {
  const results = await Promise.all(
    metricKeys.map(async (key) => [key, await getSeries(userId, key, from, to)] as const),
  );
  return Object.fromEntries(results);
}

export const getGoals = cache(async (userId: string): Promise<Goal[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fit_goal_progress", { p_user: userId });
  return (data ?? []) as Goal[];
});

export const getWorkouts = cache(
  async (userId: string, limit = 12): Promise<Workout[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fit_workouts")
      .select("*")
      .order("performed_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as Workout[];
  },
);

export const getBadges = cache(async (userId: string): Promise<Badge[]> => {
  const supabase = await createClient();
  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from("fit_badges").select("*").order("sort_order"),
    supabase.from("fit_user_badges").select("badge_key, earned_at").eq("user_id", userId),
  ]);

  const earnedAt = new Map<string, string>(
    (earned ?? []).map((e) => [e.badge_key as string, e.earned_at as string]),
  );

  return ((all ?? []) as Omit<Badge, "earned_at">[]).map((b) => ({
    ...b,
    earned_at: earnedAt.get(b.key),
  }));
});

export const getRecentEntries = cache(async (userId: string, limit = 14) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fit_entries")
    .select("id, metric_id, value, entry_date, note, created_at")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
});

/** Runs the badge rules and returns the keys newly awarded by this call. */
export async function evaluateBadges(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fit_evaluate_badges", { p_user: userId });
  if (error) throw error;
  return (data ?? []) as string[];
}

export function defaultRange(days: number): { from: string; to: string } {
  const to = todayISO();
  return { from: addDaysISO(to, -(days - 1)), to };
}
