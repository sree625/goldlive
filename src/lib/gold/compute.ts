import { HISTORY_RANGES, KARATS, TROY_OUNCE_IN_GRAMS, type HistoryRange, type Karat } from "./constants";
import type { KaratRates } from "./types";

/** INR per gram of 24K gold in India, from an international INR-per-troy-ounce spot. */
export function localPerGram24k(inrPerOunce: number, premiumPct: number): number {
  return (inrPerOunce / TROY_OUNCE_IN_GRAMS) * (1 + premiumPct / 100);
}

/** Per-gram rate for every karat, rounded to whole rupees like Indian jewellers quote. */
export function karatRates(perGram24k: number): KaratRates {
  const fine = perGram24k / KARATS["24K"];
  return Object.fromEntries(
    (Object.keys(KARATS) as Karat[]).map((k) => [k, Math.round(fine * KARATS[k])]),
  ) as KaratRates;
}

export function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / from) * 100;
}

export interface SeriesStats {
  high: { value: number; date: string };
  low: { value: number; date: string };
  average: number;
  first: number;
  last: number;
  changePct: number;
  fromHighPct: number;
}

export function seriesStats(points: { date: string; value: number }[]): SeriesStats | null {
  if (points.length === 0) return null;
  let high = points[0];
  let low = points[0];
  let sum = 0;
  for (const p of points) {
    if (p.value > high.value) high = p;
    if (p.value < low.value) low = p;
    sum += p.value;
  }
  const first = points[0].value;
  const last = points[points.length - 1].value;
  return {
    high: { value: high.value, date: high.date },
    low: { value: low.value, date: low.date },
    average: Math.round(sum / points.length),
    first,
    last,
    changePct: percentChange(first, last),
    fromHighPct: percentChange(high.value, last),
  };
}

/** Past dates (YYYY-MM-DD, oldest first) to sample for a range, ending yesterday. */
export function historyDates(range: HistoryRange, today: Date): string[] {
  const { days, stepDays } = HISTORY_RANGES[range];
  const dates: string[] = [];
  // Start from yesterday: today's value is the live quote, merged in on the client.
  for (let offset = days; offset >= 1; offset -= stepDays) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
