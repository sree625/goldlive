"use client";

import { formatInr } from "@/lib/format";
import { DISPLAY_KARATS, PURITY_LABEL, type DisplayKarat } from "@/lib/gold/constants";
import { percentChange } from "@/lib/gold/compute";
import type { HistoryPoint } from "@/lib/gold/types";
import { Delta } from "./delta";

interface KaratCardsProps {
  today: HistoryPoint | undefined;
  previous: HistoryPoint | undefined;
  grams: number;
  selected: DisplayKarat;
  onSelect: (karat: DisplayKarat) => void;
}

export function KaratCards({ today, previous, grams, selected, onSelect }: KaratCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DISPLAY_KARATS.map((karat) => {
        const active = karat === selected;
        const price = today ? today.rates[karat] * grams : undefined;
        const prev = previous ? previous.rates[karat] * grams : undefined;
        return (
          <button
            key={karat}
            type="button"
            onClick={() => onSelect(karat)}
            aria-pressed={active}
            className={`rounded-2xl bg-card p-4 text-left transition-colors sm:p-5 ${
              active ? "border-2 border-ink" : "border border-line hover:border-muted"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold">{karat}</span>
                <span className="text-xs text-muted">{PURITY_LABEL[karat]}</span>
              </p>
              {active && (
                <span className="rounded-md bg-chip px-2 py-0.5 text-xs font-medium">On chart</span>
              )}
            </div>
            {price === undefined ? (
              <div className="mt-3 space-y-2" aria-hidden>
                <div className="h-8 w-36 animate-pulse rounded bg-chip" />
                <div className="h-4 w-44 animate-pulse rounded bg-chip" />
              </div>
            ) : (
              <>
                <p className="mt-2 font-mono text-3xl font-medium tracking-tight tabular-nums">
                  {formatInr(price)}
                </p>
                {prev !== undefined ? (
                  <Delta
                    className="mt-1 block text-sm"
                    amount={price - prev}
                    pct={percentChange(prev, price)}
                    suffix="today"
                  />
                ) : (
                  <span className="mt-1 block text-sm text-muted">vs yesterday unavailable</span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
