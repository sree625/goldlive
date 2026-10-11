"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr, formatPct, formatShortDate } from "@/lib/format";
import { HISTORY_RANGES, type DisplayKarat, type HistoryRange } from "@/lib/gold/constants";
import { seriesStats } from "@/lib/gold/compute";
import type { HistoryPoint } from "@/lib/gold/types";
import { deltaColor } from "./delta";
import { Segmented } from "./segmented";

const RANGE_OPTIONS = (Object.keys(HISTORY_RANGES) as HistoryRange[]).map((id) => ({
  id,
  label: HISTORY_RANGES[id].label,
}));

const RANGE_TITLE: Record<HistoryRange, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "1y": "last year",
};

interface PriceChartProps {
  karat: DisplayKarat;
  grams: number;
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
  points: HistoryPoint[];
  today: string | null;
  loading: boolean;
  error: Error | null;
}

export function PriceChart({
  karat,
  grams,
  range,
  onRangeChange,
  points,
  today,
  loading,
  error,
}: PriceChartProps) {
  const data = useMemo(
    () => points.map((p) => ({ date: p.date, value: p.rates[karat] * grams })),
    [points, karat, grams],
  );
  const stats = seriesStats(data);
  const last = data.at(-1);

  return (
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-6" aria-labelledby="chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chart-title" className="text-lg font-semibold">
            {karat} · {RANGE_TITLE[range]}
          </h2>
          <p className="text-sm text-muted">
            {stats
              ? stats.fromHighPct === 0
                ? `At the ${HISTORY_RANGES[range].label} high of ${formatInr(stats.high.value)}.`
                : `Down ${Math.abs(stats.fromHighPct).toFixed(2)}% from the ${HISTORY_RANGES[range].label} high of ${formatInr(stats.high.value)} on ${formatShortDate(stats.high.date)}.`
              : " "}
          </p>
        </div>
        <Segmented label="Chart range" value={range} options={RANGE_OPTIONS} onChange={onRangeChange} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="From high" value={stats && formatPct(stats.fromHighPct)} tone={stats?.fromHighPct} />
        <Stat label="Change in period" value={stats && formatPct(stats.changePct)} tone={stats?.changePct} />
        <Stat label="High" value={stats && formatInr(stats.high.value)} />
        <Stat label="Low" value={stats && formatInr(stats.low.value)} />
        <Stat label="Average" value={stats && formatInr(stats.average)} />
      </dl>

      <div className="mt-4 h-64 sm:h-72">
        {error && data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">
            Couldn&apos;t load price history. {error.message}
          </p>
        ) : loading && data.length === 0 ? (
          <div className="h-full animate-pulse rounded-xl bg-chip" aria-label="Loading chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold-fill)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--gold-fill)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 4" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                ticks={data.length > 2 ? [data[0].date, data[Math.floor(data.length / 2)].date, data[data.length - 1].date] : undefined}
                tickFormatter={(d: string) => (d === today ? "Today" : formatShortDate(d))}
                tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation="right"
                domain={["dataMin", "dataMax"]}
                ticks={stats ? [stats.low.value, Math.round((stats.low.value + stats.high.value) / 2), stats.high.value] : undefined}
                tickFormatter={(v: number) => formatInr(v)}
                tickLine={false}
                axisLine={false}
                width={78}
                tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
              />
              <Tooltip
                formatter={(v) => [formatInr(Number(v)), karat]}
                labelFormatter={(d) => (d === today ? "Today" : formatShortDate(String(d)))}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Area
                type="linear"
                dataKey="value"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="url(#goldFill)"
                isAnimationActive={false}
                activeDot={{ r: 4, fill: "var(--gold)" }}
              />
              {stats && (
                <ReferenceDot
                  x={stats.high.date}
                  y={stats.high.value}
                  r={5}
                  fill="var(--card)"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  label={{ value: "High", position: "top", fill: "var(--ink)", fontSize: 11, fontWeight: 600 }}
                />
              )}
              {last && (
                <ReferenceDot x={last.date} y={last.value} r={6} fill="var(--gold)" stroke="var(--card)" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | null | undefined; tone?: number }) {
  return (
    <div className="rounded-xl bg-chip px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 font-mono text-lg font-medium tabular-nums ${tone !== undefined ? deltaColor(tone) : ""}`}>
        {value ?? <span className="inline-block h-5 w-20 animate-pulse rounded bg-line align-middle" />}
      </dd>
    </div>
  );
}
