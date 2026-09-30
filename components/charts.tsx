"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { compact, shortDate } from "@/lib/format";

export type SeriesInput = {
  key: string;
  label: string;
  color: string;
  unit: string;
  data: { day: string; value: number }[];
  /** Draw as a filled area rather than a line. */
  area?: boolean;
  dashed?: boolean;
};

const AXIS = { stroke: "rgb(5 7 10 / 0.35)", fontSize: 11 } as const;
const GRID = "rgb(5 7 10 / 0.06)";

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: { unit?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-950/10 bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] text-ink-950/45">{label ? shortDate(label) : ""}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink-950/60">{p.name}</span>
          <span className="ml-auto font-mono tabular-nums text-ink-950">
            {p.value !== undefined ? compact(Number(p.value)) : "—"}
            {p.payload?.unit ? ` ${p.payload.unit}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function mergeSeries(series: SeriesInput[]) {
  const days = [...new Set(series.flatMap((s) => s.data.map((d) => d.day)))].sort();
  return days.map((day) => {
    const row: Record<string, number | string> = { day };
    for (const s of series) {
      const hit = s.data.find((d) => d.day === day);
      if (hit) row[s.key] = Number(hit.value);
    }
    return row;
  });
}

export function TrendChart({
  series,
  height = 260,
  targetLine,
}: {
  series: SeriesInput[];
  height?: number;
  targetLine?: { value: number; label: string };
}) {
  const rows = mergeSeries(series);
  const single = series.length === 1 && series[0].area;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {single ? (
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" {...AXIS} tickFormatter={shortDate} minTickGap={28} />
          <YAxis {...AXIS} tickFormatter={compact} width={48} />
          <Tooltip content={<TooltipBox />} />
          {targetLine && (
            <ReferenceLine
              y={targetLine.value}
              stroke="rgb(5 7 10 / 0.3)"
              strokeDasharray="4 4"
              label={{ value: targetLine.label, fill: "rgb(5 7 10 / 0.4)", fontSize: 10, position: "insideTopRight" }}
            />
          )}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </AreaChart>
      ) : (
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" {...AXIS} tickFormatter={shortDate} minTickGap={28} />
          <YAxis {...AXIS} tickFormatter={compact} width={48} />
          <Tooltip content={<TooltipBox />} />
          {targetLine && (
            <ReferenceLine
              y={targetLine.value}
              stroke="rgb(5 7 10 / 0.3)"
              strokeDasharray="4 4"
              label={{ value: targetLine.label, fill: "rgb(5 7 10 / 0.4)", fontSize: 10, position: "insideTopRight" }}
            />
          )}
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, color: "rgb(5 7 10 / 0.5)", paddingTop: 8 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function ActivityBars({
  data,
  height = 200,
}: {
  data: { day: string; workouts: number; active_min: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" {...AXIS} tickFormatter={shortDate} minTickGap={20} />
        <YAxis {...AXIS} tickFormatter={compact} width={44} />
        <Tooltip
          cursor={{ fill: "rgb(5 7 10 / 0.04)" }}
          content={<TooltipBox />}
        />
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{ fontSize: 11, color: "rgb(5 7 10 / 0.5)", paddingTop: 8 }}
        />
        <Bar dataKey="active_min" name="Active min" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="workouts" name="Sessions" fill="#a3e635" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const RANGES = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 180, label: "6m" },
  { days: 365, label: "1y" },
];

export function RangePicker({ current }: { current: number }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="flex gap-1 rounded-xl border border-ink-950/8 bg-surface-2 p-1">
      {RANGES.map((r) => (
        <button
          key={r.days}
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set("range", String(r.days));
            router.replace(`?${next}`, { scroll: false });
          }}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            current === r.days
              ? "bg-surface text-ink-950 shadow-sm"
              : "text-ink-950/50 hover:text-ink-950/80"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
