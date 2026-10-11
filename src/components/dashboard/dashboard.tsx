"use client";

import { useState } from "react";
import { InstallButton } from "@/components/pwa/install-button";
import { useClock } from "@/hooks/use-clock";
import { useGoldSeries } from "@/hooks/use-gold-series";
import { formatLongDate, formatShortDate, formatTime, todayInIndia } from "@/lib/format";
import { WEIGHT_UNITS, type DisplayKarat, type HistoryRange, type WeightUnitId } from "@/lib/gold/constants";
import { HistoryTable, type TableDays } from "./history-table";
import { KaratCards } from "./karat-cards";
import { PriceChart } from "./price-chart";
import { Segmented } from "./segmented";

const UNIT_OPTIONS = WEIGHT_UNITS.map(({ id, label }) => ({ id, label }));

export function Dashboard() {
  const [unit, setUnit] = useState<WeightUnitId>("1g");
  const [karat, setKarat] = useState<DisplayKarat>("22K");
  const [range, setRange] = useState<HistoryRange>("30d");
  const [tableDays, setTableDays] = useState<TableDays>(7);

  const grams = WEIGHT_UNITS.find((u) => u.id === unit)!.grams;
  const now = useClock();
  const today = now ? todayInIndia(now) : null;

  // The 30-day daily series feeds the cards and the table; the chart has its own range.
  const daily = useGoldSeries("30d", today);
  const chart = useGoldSeries(range, today);
  const { live } = daily;

  const last = daily.points.at(-1);
  const todayPoint = last?.date === today ? last : undefined;
  const previousPoint = todayPoint ? daily.points.at(-2) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-ink" aria-hidden>
            <span className="h-4 w-6 rounded-[3px] bg-gold [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
          </span>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Gold Rate Today</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <LiveDot fetching={live.isFetching} error={live.isError} />
              <span>
                {now ? formatLongDate(now) : "Today"} · Kerala
                {live.data && <> · Updated {formatTime(new Date(live.dataUpdatedAt))}</>}
              </span>
            </p>
            {live.data && (
              <p className="mt-1">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    live.data.basis === "board" ? "bg-ink text-card" : "bg-chip text-muted"
                  }`}
                >
                  {live.data.basis === "board" && live.data.boardDate
                    ? `AKGSMA board rate · ${formatShortDate(live.data.boardDate)}`
                    : "Estimate · board rate unavailable"}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Price per</span>
          <Segmented label="Price per" value={unit} options={UNIT_OPTIONS} onChange={setUnit} />
          <InstallButton />
        </div>
      </header>

      {live.isError && (
        <p role="alert" className="rounded-xl border border-down/40 bg-card px-4 py-3 text-sm text-down">
          {live.data
            ? `Couldn't refresh the live price. Showing the last price from ${formatTime(new Date(live.dataUpdatedAt))}.`
            : `Couldn't load the live price. ${live.error.message}. Retrying automatically.`}
        </p>
      )}

      <KaratCards today={todayPoint} previous={previousPoint} grams={grams} selected={karat} onSelect={setKarat} />

      <PriceChart
        karat={karat}
        grams={grams}
        range={range}
        onRangeChange={setRange}
        points={chart.points}
        today={today}
        loading={chart.history.isPending}
        error={chart.history.error}
      />

      <HistoryTable
        points={daily.points}
        grams={grams}
        days={tableDays}
        onDaysChange={setTableDays}
        loading={daily.history.isPending}
      />

      <footer className="pb-4 text-xs leading-relaxed text-muted">
        Kerala rates follow the 22K board rate AKGSMA sets each morning (read from goodreturns.in), with 18K
        and 14K worked out from it (22K × 18/22 and × 14/22). When the board rate can&apos;t be read, and for
        days before the last 10, the app estimates it from the live international spot price plus the Kerala
        market premium ({live.data?.premiumPct ?? 15.9}%); those rows are marked &ldquo;est.&rdquo; and are
        usually within about 1%. Rates exclude 3% GST, making charges and HUID. Checks for updates every 30
        seconds.
      </footer>
    </main>
  );
}

function LiveDot({ fetching, error }: { fetching: boolean; error: boolean }) {
  const color = error ? "bg-down" : "bg-up";
  return (
    <span className="relative inline-flex size-2" aria-label={error ? "Offline" : "Live"}>
      {fetching && <span className={`absolute inset-0 animate-ping rounded-full ${color} opacity-60`} />}
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}
