"use client";

import { useId } from "react";

type Point = { day: string; value: number };

/** Dependency-free SVG sparkline. */
export function Sparkline({
  data,
  accent = "#a3e635",
  height = 44,
  showEnd = true,
  className,
}: {
  data: Point[];
  accent?: string;
  height?: number;
  showEnd?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");

  if (data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-[11px] text-ink-950/30 ${className ?? ""}`}
        style={{ height }}
      >
        not enough data
      </div>
    );
  }

  const values = data.map((d) => Number(d.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const w = 100;
  const h = 100;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [endX, endY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`w-full ${className ?? ""}`}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#s-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEnd && (
        <circle cx={endX} cy={endY} r="2.4" fill={accent} vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}
