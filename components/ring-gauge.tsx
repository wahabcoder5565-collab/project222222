"use client";

import { useId } from "react";

import { accentInk } from "@/lib/format";

/** Lets the `draw` keyframe read the dash geometry from inline custom props. */
type DrawStyle = React.CSSProperties & {
  "--dash": string;
  "--offset": string;
};

type RingGaugeProps = {
  /** 0-120. Values above 100 render a full ring plus an over-achievement flare. */
  pct: number;
  label: string;
  value: string;
  unit?: string;
  icon?: string;
  /** CSS colour for the arc. */
  accent?: string;
  size?: number;
  thickness?: number;
  caption?: string;
  sublabel?: React.ReactNode;
};

const clamp = (n: number) => Math.max(0, Math.min(120, n));

/**
 * Radial progress ring. The arc animates from empty on mount via a CSS
 * transition on `stroke-dashoffset`, which `prefers-reduced-motion` zeroes out.
 */
export function RingGauge({
  pct,
  label,
  value,
  unit,
  icon,
  accent = "#a3e635",
  size = 168,
  thickness = 11,
  caption,
  sublabel,
}: RingGaugeProps) {
  const uid = useId().replace(/:/g, "");

  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(pct);
  const filled = (Math.min(progress, 100) / 100) * circumference;
  const offset = circumference - filled;

  const arc: DrawStyle = {
    strokeDasharray: circumference,
    "--dash": String(circumference),
    "--offset": String(offset),
    animation: "draw 1.1s cubic-bezier(0.22,1,0.36,1) forwards",
    filter: progress >= 100 ? `drop-shadow(0 0 5px ${accent}90)` : undefined,
  };

  const done = progress >= 100;
  const empty = progress <= 0;
  const near = progress >= 75 && progress < 100;

  return (
    <figure className="flex flex-col items-center gap-3 text-center">
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
      >
        {done && (
          <span
            aria-hidden
            className="absolute inset-2 rounded-full blur-2xl animate-pulse-glow"
            style={{ background: accent, opacity: 0.4 }}
          />
        )}

        <svg viewBox="0 0 120 120" width={size} height={size} className="relative -rotate-90">
          <defs>
            <linearGradient id={`g-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.75" />
              <stop offset="100%" stopColor={accent} />
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness / 2}
            className="text-ink-950/6"
          />

          {progress > 100 && (
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={accent}
              strokeWidth={thickness / 5}
              strokeLinecap="round"
              strokeDasharray={circumference}
              opacity="0.35"
            />
          )}

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={`url(#g-${uid})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            style={arc}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {icon && <span aria-hidden className="text-base leading-none opacity-70">{icon}</span>}
          <span
            className="font-mono text-3xl font-semibold tabular-nums leading-none"
            style={{ color: empty ? "rgb(5 7 10 / 0.35)" : accentInk(accent) }}
          >
            {value}
          </span>
          {unit && <span className="text-[11px] text-ink-950/45">{unit}</span>}
        </div>
      </div>

      <figcaption className="space-y-0.5">
        <p className="text-sm font-medium text-ink-950/85">{label}</p>
        {caption && (
          <p className="text-xs tabular-nums text-ink-950/45">
            {done ? "Target smashed" : caption}
          </p>
        )}
        {sublabel}
        {near && <p className="text-[11px] font-medium text-ember-700">Almost there</p>}
      </figcaption>
    </figure>
  );
}
