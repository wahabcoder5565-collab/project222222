"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { evaluateBadges } from "@/lib/data";

export type FormResult = { error: string } | { ok: true; newBadges?: string[] } | null;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function awardBadges(userId: string): Promise<string[]> {
  try {
    return await evaluateBadges(userId);
  } catch {
    return [];
  }
}

function revalidateAll() {
  for (const path of ["/dashboard", "/log", "/progress", "/goals", "/achievements"]) {
    revalidatePath(path);
  }
}

export async function logEntry(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireUser();

  const value = num(formData, "value");
  const date = String(formData.get("entry_date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 280);

  if (value === null) return { error: "Enter a number to log." };
  if (value < 0) return { error: "That value cannot be negative." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a valid date." };
  if (date > new Date().toISOString().slice(0, 10)) {
    return { error: "You cannot log a future date." };
  }

  const { error } = await supabase.from("fit_entries").insert({
    user_id: user.id,
    metric_id: Number(formData.get("metric_id")),
    value,
    entry_date: date,
    note: note || null,
  });

  if (error) return { error: error.message };

  const newBadges = await awardBadges(user.id);
  revalidateAll();
  return { ok: true, newBadges };
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase
    .from("fit_entries")
    .delete()
    .eq("id", Number(formData.get("id")))
    .eq("user_id", user.id);
  revalidateAll();
}

export async function logWorkout(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireUser();

  const duration = num(formData, "duration_min");
  const date = String(formData.get("performed_on") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);

  if (!duration || duration <= 0) return { error: "How many minutes did you train?" };
  if (duration > 600) return { error: "Sessions are capped at 600 minutes." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a valid date." };
  if (date > new Date().toISOString().slice(0, 10)) {
    return { error: "You cannot log a future session." };
  }

  const { error } = await supabase.from("fit_workouts").insert({
    user_id: user.id,
    performed_on: date,
    activity: String(formData.get("activity") ?? "Other"),
    title: title || null,
    duration_min: Math.round(duration),
    intensity: Math.min(10, Math.max(1, num(formData, "intensity") ?? 5)),
    calories: num(formData, "calories"),
    distance_km: num(formData, "distance_km"),
    feeling: String(formData.get("feeling") ?? "good"),
  });

  if (error) return { error: error.message };

  const newBadges = await awardBadges(user.id);
  revalidateAll();
  return { ok: true, newBadges };
}

export async function updateProfile(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { supabase, user } = await requireUser();

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2) return { error: "Name needs at least 2 characters." };

  const height = num(formData, "height_cm");

  const { error } = await supabase
    .from("fit_profiles")
    .update({
      display_name: displayName.slice(0, 60),
      goal_focus: String(formData.get("goal_focus") ?? "").trim().slice(0, 120),
      height_cm: height,
      birth_year: num(formData, "birth_year"),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Persists the six ring-gauge targets from the settings screen. */
export async function updateTargets(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { supabase, user } = await requireUser();

  const { data: metrics } = await supabase
    .from("fit_metrics")
    .select("key, is_daily")
    .eq("is_active", true)
    .eq("is_daily", true);

  const dailyTargets: Record<string, number> = {};
  for (const metric of metrics ?? []) {
    const value = num(formData, `target_${metric.key}`);
    if (value !== null && value > 0) dailyTargets[metric.key] = value;
  }

  const { error } = await supabase
    .from("fit_profiles")
    .update({ daily_targets: dailyTargets })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidateAll();
  return { ok: true };
}
