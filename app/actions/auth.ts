"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | { ok: true } | null;

/**
 * The shared project has an unrelated `handle_new_chess_player` trigger that
 * stores `raw_user_meta_data.username` in a globally unique column. Every
 * signup therefore has to carry a unique username or the insert aborts.
 */
function uniqueUsername(seed: string): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `fp_${slug || "athlete"}${rand}`;
}

function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "That email and password combination did not match."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Tell us your name (2+ characters)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That email does not look right." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard`,
      data: { name, username: uniqueUsername(name), onboarding: true },
    },
  });

  if (error) {
    if (/already registered|already been registered/i.test(error.message)) {
      return { error: "That email already has an account. Try signing in." };
    }
    return { error: error.message };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard?welcome=1");
  }

  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
