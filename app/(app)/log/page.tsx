import { Suspense } from "react";

import { LogMetricForm, LogWorkoutForm } from "@/components/log-forms";
import { SectionTitle } from "@/components/ui";
import { deleteEntry } from "@/app/actions/data";
import { getRecentEntries, listMetrics } from "@/lib/data";
import { formatValue, shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Log" };

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [metrics, recent] = await Promise.all([listMetrics(), getRecentEntries(user!.id)]);
  const byId = new Map(metrics.map((m) => [m.id, m]));

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log activity</h1>
        <p className="mt-1 text-sm text-ink-950/45">
          Metrics close your rings. Sessions build your history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <SectionTitle title="Metric entry" sub="One number. Thirty seconds." />
          <Suspense>
            <LogMetricForm metrics={metrics} />
          </Suspense>
        </section>

        <section className="panel p-5 sm:p-6">
          <SectionTitle title="Workout session" sub="How you trained, and how it felt." />
          <LogWorkoutForm />
        </section>
      </div>

      <section>
        <SectionTitle title="Recent entries" sub="Newest first." />
        {recent.length === 0 ? (
          <div className="panel p-6 text-sm text-ink-950/45">No entries yet.</div>
        ) : (
          <ul className="panel divide-y divide-ink-950/6">
            {recent.map((entry) => {
              const metric = byId.get(entry.metric_id);
              return (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span aria-hidden className="w-5 text-center text-sm opacity-70">
                    {metric?.icon ?? "•"}
                  </span>
                  <span className="flex-1 truncate text-sm text-ink-950/75">
                    {metric?.label ?? "Metric"}
                    {entry.note && <span className="text-ink-950/35"> — {entry.note}</span>}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatValue(Number(entry.value))}
                    <span className="ml-1 text-xs text-ink-950/35">{metric?.unit}</span>
                  </span>
                  <span className="w-20 text-right text-xs text-ink-950/35">
                    {shortDate(entry.entry_date)}
                  </span>
                  <form action={deleteEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      aria-label="Delete entry"
                      className="rounded-md px-1.5 text-ink-950/25 transition hover:bg-rose-500/15 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
