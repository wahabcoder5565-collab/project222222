import "server-only";

/**
 * Server-only Gemini client.
 *
 * The key is read from a non-public env var so it is never inlined into the
 * client bundle. Never import this from a "use client" file.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Ordered by preference. The 3.5+ Flash models reason by default, which burns
 * the output budget on hidden tokens; every call sets thinkingBudget: 0.
 */
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite"] as const;

export type GeminiUsage = { promptTokens: number; outputTokens: number };

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new GeminiError(
      "GEMINI_API_KEY is not set. Add it to .env.local — it is server-only and never exposed to the browser.",
      "missing_key",
    );
  }
  return key;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

type Part = { text?: string };

type GenerateResult = {
  text: string;
  model: string;
  usage: GeminiUsage;
};

/** Strips ```json fences and pulls the first balanced JSON object/array. */
export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through to a brace scan for prose-wrapped JSON.
  }

  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new GeminiError("Model returned no JSON payload.", "bad_json");

  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1)) as T;
    }
  }

  throw new GeminiError("Model returned malformed JSON.", "bad_json");
}

async function callModel(
  model: string,
  system: string,
  user: string,
  maxOutputTokens: number,
  signal: AbortSignal | undefined,
  temperature: number,
): Promise<GenerateResult> {
  const response = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey(),
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens,
        temperature,
        topP: 0.95,
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
    }),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(
      `Gemini ${model} returned ${response.status}: ${detail.slice(0, 300)}`,
      `http_${response.status}`,
    );
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  if (json.promptFeedback?.blockReason) {
    throw new GeminiError(`Prompt blocked: ${json.promptFeedback.blockReason}`, "blocked");
  }

  // 3.5+ models emit thought parts first; concatenate every text part.
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError(
      `Gemini ${model} returned no text (${json.candidates?.[0]?.finishReason ?? "unknown"}).`,
      "empty",
    );
  }

  return {
    text,
    model,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

/**
 * Tries each model in turn. The 3.x Flash endpoints intermittently return 503,
 * so transient failures are retried with backoff before moving on.
 */
export async function generate({
  system,
  user,
  maxOutputTokens = 700,
  temperature = 0.8,
  signal,
}: {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<GenerateResult> {
  const errors: string[] = [];

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await callModel(model, system, user, maxOutputTokens, signal, temperature);
      } catch (error) {
        if (error instanceof GeminiError) {
          errors.push(`${model}: ${error.message}`);
          // Client errors will not fix themselves on retry.
          if (!/http_429|http_5\d\d/.test(error.code)) break;
        } else {
          errors.push(`${model}: ${String(error)}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }

  throw new GeminiError(`All Gemini models failed. ${errors.join(" | ")}`, "all_failed");
}

export async function generateJson<T>(opts: {
  system: string;
  user: string;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<GenerateResult & { data: T }> {
  const result = await generate({ ...opts, temperature: opts.temperature ?? 0.7 });
  return { ...result, data: parseJson<T>(result.text) };
}
