"use client";

import { formatInr, formatInrDelta, formatPct, formatRowDate } from "@/lib/format";
import { DISPLAY_KARATS } from "@/lib/gold/constants";
import { percentChange } from "@/lib/gold/compute";
import type { HistoryPoint } from "@/lib/gold/types";
import { Delta, deltaColor } from "./delta";

export const TABLE_DAY_OPTIONS = [7, 14, 30] as const;
export type TableDays = (typeof TABLE_DAY_OPTIONS)[number];

interface HistoryTableProps {
  /** Daily points, oldest first, ending today. */
  points: HistoryPoint[];
  grams: number;
  days: TableDays;
  onDaysChange: (days: TableDays) => void;
  loading: boolean;
}

export function HistoryTable({ points, grams, days, onDaysChange, loading }: HistoryTableProps) {
  // One extra point so the oldest visible row still has a "previous day" to compare with.
  const visible = points.slice(-(days + 1));
  const rows = visible
    .map((point, i) => ({ point, prev: i > 0 ? visible[i - 1] : undefined }))
    .slice(visible.length > days ? 1 : 0)
    .reverse();
  const first = visible[0];
  const last = visible.at(-1);

  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="history-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-lg font-semibold">
            Price history
          </h2>
          <p className="text-xs text-muted">
            Per {grams === 1 ? "gram" : `${grams} g`} · change vs previous day
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Show
          <select
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value) as TableDays)}
            className="h-9 rounded-lg border border-line bg-card px-3 text-sm font-medium text-ink"
          >
            {TABLE_DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
        </label>
      </div>

      {first && last && first !== last && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DISPLAY_KARATS.map((k) => {
            const from = first.rates[k] * grams;
            const to = last.rates[k] * grams;
            return (
              <div key={k} className="flex items-baseline justify-between rounded-xl bg-chip px-3 py-2.5">
                <span className="text-xs text-muted">
                  {k} · {days} days
                </span>
                <span className={`font-mono text-base font-medium ${deltaColor(to - from)}`}>
                  {formatInrDelta(to - from)} <span className="text-xs">({formatPct(percentChange(from, to))})</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              {DISPLAY_KARATS.map((k) => (
                <th key={k} scope="col" className="px-4 py-3 text-right font-medium">{k}</th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-medium">Change %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td colSpan={5} className="px-4 py-4">
                    <div className={`h-5 rounded bg-chip ${loading ? "animate-pulse" : ""}`} />
                  </td>
                </tr>
              ))}
            {rows.map(({ point, prev }) => (
              <tr key={point.date} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {formatRowDate(point.date)}
                </th>
                {DISPLAY_KARATS.map((k) => {
                  const value = point.rates[k] * grams;
                  const diff = prev ? value - prev.rates[k] * grams : null;
                  return (
                    <td key={k} className="px-4 py-3 text-right font-mono tabular-nums">
                      <div>{formatInr(value)}</div>
                      {diff !== null && (
                        <div className={`text-xs ${deltaColor(diff)}`}>{formatInrDelta(diff)}</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  {prev ? (
                    <Delta pct={percentChange(prev.rates["22K"], point.rates["22K"])} />
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
