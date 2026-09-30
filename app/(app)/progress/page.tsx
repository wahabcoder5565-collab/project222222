import { Suspense } from "react";

import { ActivityBars, RangePicker, TrendChart, type SeriesInput } from "@/components/charts";
import { SectionTitle } from "@/components/ui";
import { getActivity, getSeriesBulk, getStats, listMetrics } from "@/lib/data";
import { METRIC_ACCENT, addDaysISO, formatValue, todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Progress" };

const GROUPS: { key: string; title: string; sub: string; metrics: string[] }[] = [
  {
    key: "body",
    title: "Body composition",
    sub: "Weigh in consistently — the trend matters more than any single day.",
    metrics: ["weight_kg", "body_fat_pct", "waist_cm"],
  },
  {
    key: "daily",
    title: "Daily movement",
    sub: "Steps, active minutes and energy burn against your targets.",
    metrics: ["steps", "active_min", "calories"],
  },
  {
    key: "strength",
    title: "Strength lifts",
    sub: "Your working weight on the big three, plus pull-ups and grip.",
    metrics: ["bench_press", "squat", "deadlift", "pullups", "grip_kg"],
  },
  {
    key: "engine",
    title: "Cardio engine",
    sub: "5K pace, VO2 max and weekly distance volume.",
    metrics: ["run_5k_min", "vo2max", "run_distance", "bike_km"],
  },
  {
    key: "recovery",
    title: "Recovery & nutrition",
    sub: "Sleep, hydration, protein and resting heart rate.",
    metrics: ["sleep_h", "water_l", "protein_g", "resting_hr"],
  },
];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const params = await searchParams;
  const days = [30, 90, 180, 365].includes(Number(params.range))
    ? Number(params.range)
    : 90;

  const to = todayISO();
  const from = addDaysISO(to, -(days - 1));

  const allKeys = GROUPS.flatMap((g) => g.metrics);
  const [metrics, stats, activity, series] = await Promise.all([
    listMetrics(),
    getStats(userId),
    getActivity(userId, from, to),
    getSeriesBulk(userId, allKeys, from, to),
  ]);

  const byKey = new Map(metrics.map((m) => [m.key, m]));

  const toSeries = (keys: string[], area = false): SeriesInput[] =>
    keys
      .filter((key) => byKey.has(key))
      .map((key) => {
        const metric = byKey.get(key)!;
        return {
          key,
          label: metric.label,
          unit: metric.unit,
          color: METRIC_ACCENT[key] ?? "#a3e635",
          area,
          data: series[key] ?? [],
        };
      });

  const bests = allKeys
    .map((key) => {
      const data = series[key] ?? [];
      if (!data.length) return null;
      const values = data.map((d) => Number(d.value));
      const direction = byKey.get(key)?.direction;
      return {
        key,
        metric: byKey.get(key)!,
        first: values[0],
        last: values[values.length - 1],
        delta: values[values.length - 1] - values[0],
        best: direction === "lower" ? Math.min(...values) : Math.max(...values),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x) => Math.abs(x.delta) > 0.001)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8);

  const moved = (b: (typeof bests)[number]) =>
    b.metric.direction === "lower" ? b.delta < 0 : b.delta > 0;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="mt-1 text-sm text-ink-950/45">
            {stats.active_days} active days · {stats.entries.toLocaleString()} entries ·{" "}
            {Math.round(stats.workout_min / 60).toLocaleString()} hours trained
          </p>
        </div>
        <Suspense>
          <RangePicker current={days} />
        </Suspense>
      </div>

      {bests.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bests.map((b) => {
            const good = moved(b);
            return (
              <div key={b.key} className="panel p-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{b.metric.icon}</span>
                  <p className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
                    {b.metric.label}
                  </p>
                </div>
                <p className="mt-2 font-mono text-2xl leading-none font-semibold tabular-nums">
                  {formatValue(b.last)}
                  <span className="ml-1 text-sm font-normal text-ink-950/40">{b.metric.unit}</span>
                </p>
                <p
                  className={`mt-2 text-xs font-medium tabular-nums ${
                    good ? "text-ember-700" : "text-rose-600"
                  }`}
                >
                  {b.delta > 0 ? "+" : ""}
                  {b.delta.toFixed(1)} {b.metric.unit} over {days}d
                </p>
                <p className="mt-0.5 text-[11px] text-ink-950/30">
                  best {formatValue(b.best)} {b.metric.unit}
                </p>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <SectionTitle title="Session volume" sub="Active minutes and sessions per day." />
        <div className="panel p-4 sm:p-5">
          <ActivityBars
            data={activity.map((a) => ({
              day: a.day,
              workouts: a.workouts,
              active_min: Number(a.active_min),
            }))}
          />
        </div>
      </section>

      {GROUPS.map((group) => {
        const data = toSeries(group.metrics);
        const primary = byKey.get(group.metrics[0]);
        if (!data.some((s) => s.data.length)) return null;

        return (
          <section key={group.key}>
            <SectionTitle title={group.title} sub={group.sub} />
            <div className="panel p-4 sm:p-5">
              <TrendChart
                series={data}
                height={group.metrics.length === 1 ? 240 : 280}
                targetLine={
                  primary?.default_target
                    ? { value: Number(primary.default_target), label: `target ${primary.default_target}` }
                    : undefined
                }
              />
            </div>
          </section>
        );
      })}

      <section>
        <SectionTitle title="Steps vs target" sub="The daily ring, over time." />
        <div className="panel p-4 sm:p-5">
          <TrendChart
            series={toSeries(["steps"], true)}
            height={240}
            targetLine={{ value: 10000, label: "10,000 steps" }}
          />
        </div>
      </section>

      <p className="text-center text-xs text-ink-950/30">
        Showing {days} days ending {to}. Individual days are noisy — read the trend.
      </p>
    </div>
  );
}
