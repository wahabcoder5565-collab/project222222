"use server";

import { revalidatePath } from "next/cache";

import { buildCoachContext, contextToPrompt, type CoachContext } from "@/lib/ai-context";
import { GeminiError, generate, generateJson, isAiConfigured } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";

export type Briefing = {
  headline: string;
  read: string;
  focus: string;
  nudge: string;
  question: string;
  tone: "fire" | "win" | "push" | "calm";
};

export type BriefingResult =
  | { ok: true; briefing: Briefing; model: string; cached: boolean }
  | { ok: false; error: string; code: string };

const SYSTEM = `You are FitPulse Coach, an elite strength-and-conditioning coach who has read one athlete's entire training log.

Rules you must follow:
- Speak only about the numbers you are given. Never invent a metric, a session, or a personal best that is not in the data.
- If the data is thin (a brand-new athlete), coach the habit, not a performance that does not exist yet.
- Be specific and quantitative. Reference actual values, deltas, and streaks.
- Be direct and honest. If a goal is going to be missed, say so plainly and say what to change.
- Never diagnose injuries or give medical advice. If the data suggests pain or overtraining, suggest consulting a professional.
- Motivational, never cheesy. Short sentences. No emoji. No exclamation marks.
- ALWAYS write numbers as digits, never words. "137.4 kg", not "one hundred thirty-seven point four".
- Plain text only. No markdown, no bullet characters, no bold.

Your job for the daily briefing is to produce strictly valid JSON with exactly these keys:
{
  "headline": "max 9 words. The single most important thing for this athlete today.",
  "read":    "2-3 sentences. What the data actually says happened. Cite real numbers.",
  "focus":   "1-2 sentences. The one concrete action for today.",
  "nudge":   "1-2 sentences. The emotional hook - what they stand to gain or lose. Reference the streak or a goal.",
  "question": "One open question that makes them think, e.g. about a plateau or a tradeoff.",
  "tone":    "exactly one of: fire, win, push, calm"
}`;

function fallbackBriefing(ctx: CoachContext): Briefing {
  const missed = ctx.rings.split("\n").filter((r) => r.includes("(0%)")).length;
  const done = ctx.rings.split("\n").filter((r) => !r.includes("(0%)")).length;
  return {
    headline: ctx.stats.streak > 0 ? `${ctx.stats.streak} days still burning` : "Start the streak",
    read: `${done} of ${ctx.rings.split("\n").length} rings are on track today, with ${missed} still at zero. This week: ${ctx.week}.`,
    focus:
      missed > 0
        ? "Log the cheapest missing ring first. Momentum beats perfection."
        : "Close the loop with a session that matches the quality of your numbers.",
    nudge: `Level ${ctx.stats.level} is ${ctx.stats.xp} XP in. Each entry is worth XP, and the streak only survives if you log.`,
    question: "What would today look like if it went exactly as planned?",
    tone: ctx.stats.streak > 6 ? "fire" : "calm",
  };
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/**
 * Returns today's briefing, generating it once per athlete per day.
 * The DB row is the cache — the model is not called on every render.
 */
export async function getDailyBriefing(
  options: { force?: boolean } = {},
): Promise<BriefingResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const today = todayISO();

  const { data: cached } = await supabase
    .from("fit_ai_messages")
    .select("payload, model")
    .eq("user_id", userId)
    .eq("kind", "briefing")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.payload && !options.force) {
    return { ok: true, briefing: cached.payload as Briefing, model: cached.model ?? "cache", cached: true };
  }

  if (!isAiConfigured()) {
    const ctx = await buildCoachContext(userId);
    return { ok: true, briefing: fallbackBriefing(ctx), model: "local-fallback", cached: false };
  }

  const ctx = await buildCoachContext(userId);

  try {
    const { data, model, usage } = await generateJson<Briefing>({
      system: SYSTEM,
      user: contextToPrompt(ctx),
      maxOutputTokens: 700,
    });

    // Guard against a structurally valid but empty response.
    const briefing: Briefing = {
      headline: String(data.headline ?? "").trim() || "Stay the course",
      read: String(data.read ?? "").trim(),
      focus: String(data.focus ?? "").trim(),
      nudge: String(data.nudge ?? "").trim(),
      question: String(data.question ?? "").trim(),
      tone: (["fire", "win", "push", "calm"] as const).includes(data.tone as never)
        ? data.tone
        : "calm",
    };

    await supabase.from("fit_ai_messages").insert({
      user_id: userId,
      role: "assistant",
      kind: "briefing",
      content: briefing.read,
      payload: briefing,
      model,
      prompt_tokens: usage.promptTokens,
      output_tokens: usage.outputTokens,
    });

    revalidatePath("/dashboard");
    return { ok: true, briefing, model, cached: false };
  } catch (error) {
    const code = error instanceof GeminiError ? error.code : "unknown";
    return {
      ok: false,
      error: `The coach could not be reached (${code}). Showing the local summary instead.`,
      code,
    };
  }
}

const CHAT_SYSTEM = `You are FitPulse Coach, a direct and numerate strength coach.

You are answering questions about ONE athlete using the data snapshot below.

Rules:
- Ground every claim in the provided numbers. If the snapshot does not contain what is needed, say so and name the metric that is missing.
- Be concise: 120 words maximum unless the athlete explicitly asks for depth.
- Quantify. Use the actual values.
- Be honest about plateaus and about goals that are at risk.
- Never diagnose injuries or prescribe medical treatment.
- ALWAYS write numbers as digits, never words.
- No emoji. No exclamation marks. Plain text, no markdown and no bullet characters.`;

/** Single-turn answer grounded in the athlete's current data plus chat history. */
export async function askCoach(
  question: string,
  history: { role: string; content: string }[] = [],
): Promise<
  | { ok: true; answer: string; model: string }
  | { ok: false; error: string; code: string }
> {
  const userId = await requireUserId();
  const clean = question.trim().slice(0, 800);

  if (!clean) return { ok: false, error: "Ask something first.", code: "empty" };
  if (!isAiConfigured()) {
    return { ok: false, error: "GEMINI_API_KEY is not configured on the server.", code: "missing_key" };
  }

  const supabase = await createClient();
  const ctx = await buildCoachContext(userId);

  // Rebuild the conversation as a single prompt so every turn carries the
  // same live data snapshot.
  const transcript = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Athlete" : "Coach"}: ${m.content}`)
    .join("\n");

  const prompt = [
    "DATA SNAPSHOT (today):",
    contextToPrompt(ctx),
    transcript ? `\nRECENT CONVERSATION:\n${transcript}` : "",
    `\nATHLETE'S QUESTION: ${clean}`,
    "\nAnswer as the coach, grounded only in the snapshot above.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { text, model, usage } = await generate({
      system: CHAT_SYSTEM,
      user: prompt,
      maxOutputTokens: 600,
      temperature: 0.7,
    });

    await supabase.from("fit_ai_messages").insert([
      { user_id: userId, role: "user", kind: "chat", content: clean },
      {
        user_id: userId,
        role: "assistant",
        kind: "chat",
        content: text,
        model,
        prompt_tokens: usage.promptTokens,
        output_tokens: usage.outputTokens,
      },
    ]);

    return { ok: true, answer: text, model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof GeminiError ? error.message : "The coach is unavailable.",
      code: error instanceof GeminiError ? error.code : "unknown",
    };
  }
}

/** Chat history for the coach page. */
export async function getChatHistory(limit = 30) {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("fit_ai_messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .eq("kind", "chat")
    .order("created_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function clearChatHistory(): Promise<void> {
  const userId = await requireUserId();
  const supabase = await createClient();
  await supabase
    .from("fit_ai_messages")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "chat");
  revalidatePath("/coach");
}
