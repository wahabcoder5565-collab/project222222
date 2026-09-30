export function StreakFlame({ days, size = 40 }: { days: number; size?: number }) {
  const lit = days > 0;
  const hot = days >= 7;
  const hot2 = days >= 30;

  const color = hot2 ? "#fb7185" : hot ? "#fbbf24" : "#94a3b8";

  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      {lit && (
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full blur-xl ${hot ? "animate-pulse-glow" : ""}`}
          style={{ background: color, opacity: hot ? 0.5 : 0.25 }}
        />
      )}
      <span
        aria-hidden
        className="relative select-none"
        style={{ fontSize: size * 0.58, lineHeight: 1, filter: lit ? `drop-shadow(0 0 6px ${color}80)` : "grayscale(1) opacity-40" }}
      >
        🔥
      </span>
    </span>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.18em] text-ember-700/80 uppercase">
      {children}
    </p>
  );
}

export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-ink-950/45">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden className="text-4xl opacity-70">
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-ink-950/45">{body}</p>
      {action}
    </div>
  );
}
