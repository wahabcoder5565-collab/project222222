import { ProfileForm, TargetsForm, DangerZone } from "@/components/settings-forms";
import { SectionTitle } from "@/components/ui";
import { getProfile, listMetrics, getStats } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

const FOCUS = [
  "Build strength without losing my aerobic base",
  "Get consistent again after a rough patch",
  "Run my first half marathon",
  "Body recomposition",
  "Stay injury-free while training more",
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [profile, metrics, stats] = await Promise.all([
    getProfile(userId),
    listMetrics(),
    getStats(userId),
  ]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-ink-950/45">
          Signed in as {user!.email}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle title="Profile" sub="What the coach calls you." />
          <div className="panel p-5">
            <ProfileForm profile={profile} />
            <div className="mt-5 border-t border-ink-950/7 pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-950/50 uppercase">
                Focus presets
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {FOCUS.map((f) => (
                  <li
                    key={f}
                    className="rounded-lg border border-ink-950/8 bg-ink-950/3 px-2 py-1 text-[11px] text-ink-950/50"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle title="Daily ring targets" sub="What counts as a full ring." />
          <div className="panel p-5">
            <TargetsForm metrics={metrics} profile={profile} />
          </div>
        </section>
      </div>

      <section>
        <SectionTitle title="Lifetime totals" sub="Everything the badge engine counts." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Level", value: String(stats.level), sub: `${stats.xp.toLocaleString()} XP` },
            { label: "Active days", value: String(stats.active_days), sub: `best streak ${stats.best_streak}` },
            { label: "Sessions", value: String(stats.workouts), sub: `${Math.round(stats.workout_min / 60)} h trained` },
            { label: "Entries", value: stats.entries.toLocaleString(), sub: `${stats.workout_kcal.toLocaleString()} kcal burned` },
          ].map((s) => (
            <div key={s.label} className="panel p-4">
              <p className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">
                {s.label}
              </p>
              <p className="mt-1.5 font-mono text-2xl leading-none font-semibold tabular-nums">
                {s.value}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-950/35">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <DangerZone />
    </div>
  );
}
