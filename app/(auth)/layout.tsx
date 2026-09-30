import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-ink-950/7 p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 size-[30rem] rounded-full bg-ember-500/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 size-[26rem] rounded-full bg-violet-500/12 blur-3xl"
        />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight">
            Every rep you log
            <br />
            makes the <span className="text-gradient">next one</span> easier.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-950/50">
            FitPulse turns scattered numbers into visible momentum — daily rings, a live
            streak, and progress you can actually read at a glance.
          </p>

          <dl className="mt-10 grid grid-cols-3 gap-4">
            {[
              { k: "Rings", v: "6 daily" },
              { k: "Streak", v: "Every day" },
              { k: "Badges", v: "20 to earn" },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-ink-950/8 bg-ink-950/3 px-4 py-3">
                <dt className="text-[11px] tracking-wide text-ink-950/40 uppercase">{s.k}</dt>
                <dd className="mt-1 text-sm font-semibold">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-ink-950/25">
          Training data is protected by row-level security — your rows are yours alone.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
