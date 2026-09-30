import type { Metric } from "./types";

export function formatValue(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Number(value);
  if (unit === "steps") return Math.round(n).toLocaleString();
  if (Math.abs(n) >= 100) return Math.round(n).toLocaleString();
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return Number(n.toFixed(2)).toString();
}

export function formatUnit(value: number, unit: string): string {
  return `${formatValue(value)} ${unit === "steps" ? "steps" : unit}`;
}

/** A compact axis/label value: 12.5k instead of 12500. */
export function compact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(value / 1000)}k`;
  if (n >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (n >= 10) return value.toFixed(0);
  return Number(value.toFixed(1)).toString();
}

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Percent change, guarding division by zero. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous || !Number.isFinite(previous)) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const ACTIVITIES = [
  "Strength",
  "Run",
  "Cycle",
  "Swim",
  "Row",
  "HIIT",
  "Yoga",
  "Walk",
  "Sport",
  "Other",
] as const;

export const FEELINGS = ["great", "good", "ok", "rough"] as const;

export const GOAL_COLORS = ["emerald", "violet", "amber", "sky", "rose", "lime"] as const;

/** Per-metric accent so a chart's colour is stable across the whole app. */
export const METRIC_ACCENT: Record<string, string> = {
  steps: "#38bdf8",
  calories: "#fb923c",
  water_l: "#22d3ee",
  sleep_h: "#a78bfa",
  active_min: "#34d399",
  protein_g: "#f472b6",
  bench_press: "#34d399",
  squat: "#a78bfa",
  deadlift: "#fbbf24",
  pullups: "#f472b6",
  plank_sec: "#22d3ee",
  grip_kg: "#fb923c",
  run_5k_min: "#38bdf8",
  run_distance: "#38bdf8",
  vo2max: "#4ade80",
  bike_km: "#c084fc",
  weight_kg: "#f59e0b",
  body_fat_pct: "#fb7185",
  waist_cm: "#fb7185",
  resting_hr: "#60a5fa",
  recovery_pct: "#2dd4bf",
  flex_cm: "#a3e635",
};

export function accentFor(metric: Pick<Metric, "key"> | null | undefined): string {
  if (!metric) return "#34d399";
  return METRIC_ACCENT[metric.key] ?? "#34d399";
}

/**
 * Accent hexes are tuned to pop against dark surfaces. On the light panels they
 * wash out, so any accent used as *text* is pulled toward ink first.
 */
export function accentInk(accent: string): string {
  return `color-mix(in oklab, ${accent} 58%, #0b1220)`;
}

export const GOAL_ACCENT: Record<string, string> = {
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
  sky: "#38bdf8",
  rose: "#fb7185",
  lime: "#a3e635",
};

export const TIER_ACCENT: Record<string, string> = {
  bronze: "#d97706",
  silver: "#94a3b8",
  gold: "#fbbf24",
  legend: "#f472b6",
};
