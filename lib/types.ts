export type MetricDirection = "higher" | "lower" | "range";
export type MetricAgg = "sum" | "avg" | "max" | "min" | "last";
export type GoalColor = "emerald" | "violet" | "amber" | "sky" | "rose" | "lime";
export type BadgeTier = "bronze" | "silver" | "gold" | "legend";
export type Activity =
  | "Strength"
  | "Run"
  | "Cycle"
  | "Swim"
  | "Row"
  | "HIIT"
  | "Yoga"
  | "Walk"
  | "Sport"
  | "Other";
export type Feeling = "great" | "good" | "ok" | "rough";

export type Profile = {
  id: string;
  display_name: string;
  goal_focus: string;
  height_cm: number | null;
  birth_year: number | null;
  daily_targets: Record<string, number>;
};

export type Metric = {
  id: number;
  key: string;
  label: string;
  unit: string;
  category: "body" | "strength" | "cardio" | "recovery" | "lifestyle";
  icon: string;
  direction: MetricDirection;
  agg: MetricAgg;
  is_daily: boolean;
  default_target: number | null;
  step: number;
  sort_order: number;
};

export type Gauge = {
  metric_key: string;
  label: string;
  unit: string;
  icon: string;
  direction: MetricDirection;
  value: number;
  target: number;
  pct: number;
};

export type DailyActivity = {
  day: string;
  workouts: number;
  active_min: number;
  calories: number;
  entries: number;
  intensity: number;
};

export type SeriesPoint = { day: string; value: number };

export type Goal = {
  id: number;
  label: string;
  unit: string;
  direction: "higher" | "lower";
  start_value: number;
  target_value: number;
  current_value: number | null;
  pct: number;
  color: GoalColor;
  start_date: string;
  target_date: string;
  days_left: number;
  metric_key: string | null;
  archived: boolean;
};

export type Workout = {
  id: number;
  performed_on: string;
  activity: Activity;
  title: string | null;
  duration_min: number;
  intensity: number;
  calories: number | null;
  distance_km: number | null;
  feeling: Feeling | null;
};

export type Badge = {
  key: string;
  title: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  xp: number;
  rule: Record<string, unknown>;
  earned_at?: string;
};

export type UserStats = {
  xp: number;
  level: number;
  xp_into_level: number;
  xp_for_level: number;
  badge_xp: number;
  badges: number;
  streak: number;
  best_streak: number;
  active_days: number;
  workouts: number;
  workout_min: number;
  workout_kcal: number;
  entries: number;
  goals_active: number;
  goals_done: number;
  prs: Record<string, number>;
};
