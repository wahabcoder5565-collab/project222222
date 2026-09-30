"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { evaluateBadges } from "@/lib/data";
import type { FormResult } from "./data";

export type { FormResult };

export async function createGoal(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const label = String(formData.get("label") ?? "").trim();
  const start = Number(formData.get("start_value"));
  const target = Number(formData.get("target_value"));
  const direction = String(formData.get("direction") ?? "higher") === "lower" ? "lower" : "higher";
  const targetDate = String(formData.get("target_date") ?? "").trim();

  if (label.length < 3) return { error: "Give the goal a name." };
  if (!Number.isFinite(start)) return { error: "Enter where you are starting from." };
  if (!Number.isFinite(target) || target === start) {
    return { error: "The target must differ from your starting point." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return { error: "Pick a target date." };
  if (targetDate < new Date().toISOString().slice(0, 10)) {
    return { error: "The target date needs to be in the future." };
  }
  if (direction === "higher" && target < start) {
    return { error: "A 'build up' target has to be above your starting value." };
  }
  if (direction === "lower" && target > start) {
    return { error: "A 'get lower' target has to be below your starting value." };
  }

  const { error } = await supabase.from("fit_goals").insert({
    user_id: user.id,
    metric_id: formData.get("metric_id") ? Number(formData.get("metric_id")) : null,
    label: label.slice(0, 80),
    unit: String(formData.get("unit") ?? "").trim().slice(0, 12) || "units",
    direction,
    start_value: start,
    target_value: target,
    start_date: new Date().toISOString().slice(0, 10),
    target_date: targetDate,
    color: String(formData.get("color") ?? "emerald"),
  });

  if (error) return { error: error.message };

  const newBadges = await evaluateBadges(user.id).catch(() => []);
  for (const path of ["/dashboard", "/goals", "/achievements"]) revalidatePath(path);
  return { ok: true, newBadges };
}

export async function archiveGoal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("fit_goals")
    .update({ archived: true })
    .eq("id", Number(formData.get("id")))
    .eq("user_id", user.id);

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
