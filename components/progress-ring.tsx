"use client";

import { useId } from "react";

type DrawStyle = React.CSSProperties & {
  "--dash": string;
  "--offset": string;
};

/** Slim ring used for level progress and inline goal tracking. */
export function ProgressRing({
  pct,
  size = 56,
  thickness = 5,
  accent = "#a3e635",
  children,
}: {
  pct: number;
  size?: number;
  thickness?: number;
  accent?: string;
  children?: React.ReactNode;
}) {
  const uid = useId().replace(/:/g, "");

  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * circumference;

  const arc: DrawStyle = {
    strokeDasharray: circumference,
    "--dash": String(circumference),
    "--offset": String(circumference - filled),
    animation: "draw 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
  };

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`p-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-ink-950/8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={`url(#p-${uid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          style={arc}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
