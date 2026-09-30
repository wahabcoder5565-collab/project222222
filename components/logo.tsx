import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="group flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-ember-300 to-ember-500 text-ink-950 shadow-lg shadow-ember-500/20">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
          <path
            d="M3 13h3.2l2-5 3 10 2.6-7 1.6 2H21"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">
          Fit<span className="text-ember-700">Pulse</span>
        </span>
      )}
    </Link>
  );
}
