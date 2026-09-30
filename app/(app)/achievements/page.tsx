import { ProgressRing } from "@/components/progress-ring";
import { Kicker, SectionTitle } from "@/components/ui";
import { badgeProgress } from "@/lib/coach";
import { getBadges, getStats } from "@/lib/data";
import { TIER_ACCENT, accentInk, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Badge, UserStats } from "@/lib/types";

export const metadata = { title: "Achievements" };

const TIERS = ["legend", "gold", "silver", "bronze"] as const;

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const [badges, stats] = await Promise.all([getBadges(userId), getStats(userId)]);

  const earned = badges.filter((b) => b.earned_at);
  const locked = badges
    .filter((b) => !b.earned_at)
    .map((b) => ({ badge: b, ...badgeProgress(b, stats) }))
    .sort((a, b) => b.pct - a.pct);

  const byTier = TIERS.map((tier) => ({
    tier,
    items: badges.filter((b) => b.tier === tier),
  }));

  return (
    <div className="grid gap-8">
      <div className="panel relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-10 size-72 rounded-full bg-flame-500/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-6">
          <ProgressRing
            pct={badges.length ? (earned.length / badges.length) * 100 : 0}
            size={104}
            thickness={4}
            accent="#fbbf24"
          >
            <div className="text-center leading-none">
              <p className="font-mono text-xl font-semibold tabular-nums">
                {earned.length}
                <span className="text-ink-950/30">/{badges.length}</span>
              </p>
              <p className="mt-0.5 text-[8px] tracking-widest text-ink-950/40 uppercase">
                earned
              </p>
            </div>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <Kicker>Hall of effort</Kicker>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              {earned.length === badges.length
                ? "Every badge. Every tier. Complete."
                : `${stats.badges} badges unlocked, ${locked.length} still in play`}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-ink-950/50">
              Badges award themselves the moment the underlying rule is satisfied — no claim
              button, no hunting. They are a record of what you actually did.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TIERS.map((t) => {
                const total = badges.filter((b) => b.tier === t).length;
                const got = badges.filter((b) => b.tier === t && b.earned_at).length;
                return (
                  <span
                    key={t}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize"
                    style={{
                      color: TIER_ACCENT[t],
                      borderColor: `${TIER_ACCENT[t]}44`,
                      background: `${TIER_ACCENT[t]}14`,
                    }}
                  >
                    {t} {got}/{total}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="text-right">
            <p className="font-mono text-3xl leading-none font-semibold tabular-nums text-flame-600">
              {stats.badge_xp.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] tracking-wide text-ink-950/40 uppercase">
              badge XP · {stats.xp.toLocaleString()} total
            </p>
          </div>
        </div>
      </div>

      {byTier.map(({ tier, items }) => (
        <section key={tier}>
          <SectionTitle
            title={`${tier[0].toUpperCase()}${tier.slice(1)} badges`}
            sub={`${items.filter((b) => b.earned_at).length} of ${items.length} earned`}
          />
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((badge) => {
              const got = Boolean(badge.earned_at);
              const accent = TIER_ACCENT[badge.tier];
              return (
                <li
                  key={badge.key}
                  className={`panel relative overflow-hidden p-4 ${got ? "" : "opacity-70"}`}
                >
                  {got && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-12 -right-8 size-28 rounded-full blur-2xl"
                      style={{ background: accent, opacity: 0.18 }}
                    />
                  )}
                  <div className="relative flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-xl"
                      style={{
                        background: got ? `${accent}22` : "rgb(5 7 10 / 4%)",
                        color: got ? accentInk(accent) : "rgb(5 7 10 / 0.3)",
                        filter: got ? `drop-shadow(0 0 8px ${accent}55)` : "grayscale(1)",
                        border: got ? `1px solid ${accent}44` : "1px dashed rgb(5 7 10 / 10%)",
                      }}
                    >
                      {badge.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{badge.title}</h3>
                        <span
                          className="shrink-0 font-mono text-[11px] font-semibold tabular-nums"
                          style={{ color: got ? accentInk(accent) : "rgb(5 7 10 / 0.25)" }}
                        >
                          +{badge.xp}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-950/45">{badge.description}</p>
                      {got ? (
                        <p className="mt-2 text-[11px] font-medium" style={{ color: accentInk(accent) }}>
                          Earned {badge.earned_at ? shortDate(badge.earned_at.slice(0, 10)) : ""}
                        </p>
                      ) : (
                        <LockedProgress badge={badge} stats={stats} />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LockedProgress({ badge, stats }: { badge: Badge; stats: UserStats }) {
  const { pct, remaining, unit } = badgeProgress(badge, stats);
  return (
    <div className="mt-2.5">
      <div className="h-1 overflow-hidden rounded-full bg-ink-950/8">
        <div
          className="h-full rounded-full bg-ink-950/25"
          style={{ width: `${Math.max(1.5, pct)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-ink-950/30">
        {remaining > 0
          ? `${remaining} more ${unit || "to go"} · ${Math.round(pct)}%`
          : "Ready to claim"}
      </p>
    </div>
  );
}
