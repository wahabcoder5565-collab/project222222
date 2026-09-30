import type { ReactNode } from "react";

import { accentInk } from "@/lib/format";

import { Sparkline } from "./sparkline";

export function StatTile({
  label,
  value,
  unit,
  icon,
  accent = "#a3e635",
  delta,
  deltaLabel,
  trend,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: string;
  accent?: string;
  /** Signed percentage change vs the comparison period. */
  delta?: number | null;
  deltaLabel?: string;
  trend?: { day: string; value: number }[];
  children?: ReactNode;
}) {
  const improving = delta === undefined || delta === null ? null : delta > 0;
  const flat = delta !== undefined && delta !== null && Math.abs(delta) < 0.5;

  return (
    <div className="panel panel-hover flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        {icon && (
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-md text-[11px]"
            style={{ background: `${accent}1f`, color: accentInk(accent) }}
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-medium tracking-wide text-ink-950/50 uppercase">{label}</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-2xl leading-none font-semibold tabular-nums">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-ink-950/40">{unit}</span>}
        </p>
        {!flat && improving !== null && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
              improving ? "bg-ember-400/15 text-ember-700" : "bg-rose-500/15 text-rose-600"
            }`}
          >
            {improving ? "+" : ""}
            {delta!.toFixed(0)}%
          </span>
        )}
      </div>

      {trend && trend.length > 1 && <Sparkline data={trend} accent={accent} height={36} />}
      {deltaLabel && !flat && <p className="text-[11px] text-ink-950/35">{deltaLabel}</p>}
      {children}
    </div>
  );
}
