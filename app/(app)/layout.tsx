import { redirect } from "next/navigation";

import { DesktopSidebar, Sidebar } from "@/components/sidebar";
import { getProfile, getStats } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects, but never render private data without a check.
  if (!user) redirect("/login");

  const [profile, stats] = await Promise.all([getProfile(user.id), getStats(user.id)]);
  const levelPct = stats.xp_for_level
    ? (stats.xp_into_level / stats.xp_for_level) * 100
    : 0;

  const shell = {
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Athlete",
    level: stats.level,
    levelPct,
    streak: stats.streak,
  };

  return (
    <div className="relative z-10 flex min-h-dvh">
      <DesktopSidebar {...shell} />
      <div className="min-w-0 flex-1">
        <Sidebar {...shell} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
