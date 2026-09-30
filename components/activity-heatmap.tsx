"use client";

type Cell = { day: string; value: number };

const LEVELS = [
  { min: 0, cls: "bg-ink-950/6" },
  { min: 1, cls: "bg-ember-500/25" },
  { min: 3, cls: "bg-ember-400/45" },
  { min: 5, cls: "bg-ember-400/70" },
  { min: 7, cls: "bg-ember-300" },
];

function levelFor(value: number) {
  return LEVELS.reduce((acc, cur, i) => (value >= cur.min ? i : acc), 0);
}

/**
 * GitHub-style contribution grid. Columns are ISO weeks, rows are weekdays.
 * `intensity` is 0-10 from the activity rollup.
 */
export function ActivityHeatmap({ days }: { days: Cell[] }) {
  if (!days.length) {
    return <p className="text-sm text-ink-950/40">No activity recorded yet.</p>;
  }

  const byDay = new Map(days.map((d) => [d.day, d.value]));
  const last = days[days.length - 1].day;

  // Pad the start so column 0 is a Sunday.
  const startDate = new Date(`${days[0].day}T00:00:00`);
  const leading = startDate.getDay();
  const cells: { day: string; value: number; future: boolean }[] = [];

  for (let i = 0; i < leading; i += 1) cells.push({ day: "", value: 0, future: true });
  for (const d of days) cells.push({ day: d.day, value: byDay.get(d.day) ?? 0, future: false });

  const lastDate = new Date(`${last}T00:00:00`);
  const total = leading + days.length;
  const padded = Math.ceil(total / 7) * 7;
  for (let i = total; i < padded; i += 1) cells.push({ day: "", value: 0, future: true });

  void lastDate;

  const monthMarks: { index: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < Math.ceil(padded / 7); col += 1) {
    const cell = cells[col * 7];
    if (!cell?.day) continue;
    const month = new Date(`${cell.day}T00:00:00`).getMonth();
    if (month !== lastMonth) {
      monthMarks.push({ index: col, label: new Date(`${cell.day}T00:00:00`).toLocaleDateString(undefined, { month: "short" }) });
      lastMonth = month;
    }
  }

  return (
    <div className="flex gap-2">
      <div className="grid grid-rows-7 gap-[3px] pt-5 text-[9px] text-ink-950/30">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="flex h-[11px] items-center leading-none">
            {i % 2 === 1 ? d : ""}
          </span>
        ))}
      </div>

      <div className="scroll-slim overflow-x-auto">
        <div className="relative">
          <div className="relative mb-1 flex gap-[3px] text-[9px] text-ink-950/35">
            {Array.from({ length: Math.ceil(padded / 7) }, (_, col) => {
              const mark = monthMarks.find((m) => m.index === col);
              return (
                <span key={col} className="w-[11px] shrink-0 whitespace-nowrap">
                  {mark?.label ?? ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: Math.ceil(padded / 7) }, (_, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, row) => {
                  const cell = cells[col * 7 + row];
                  if (!cell || cell.future) {
                    return <span key={row} className="size-[11px] rounded-[3px]" />;
                  }
                  const level = levelFor(cell.value);
                  return (
                    <span
                      key={row}
                      title={`${cell.day} — ${cell.value > 0 ? `${cell.value} min active` : "rest day"}`}
                      className={`size-[11px] rounded-[3px] ${LEVELS[level].cls} ring-1 ring-ink-950/5`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
