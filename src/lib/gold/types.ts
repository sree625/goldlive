import type { HistoryRange, Karat } from "./constants";

export type KaratRates = Record<Karat, number>;

export interface LiveQuote {
  /** INR per gram, by karat, including the India import premium. */
  rates: KaratRates;
  /** International spot in USD per troy ounce, when the source gives it. */
  spotUsdPerOunce: number | null;
  usdInr: number | null;
  premiumPct: number;
  /** ISO time the upstream price was last updated. */
  updatedAt: string;
  source: string;
}

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  rates: KaratRates;
}

export interface History {
  range: HistoryRange;
  points: HistoryPoint[];
  premiumPct: number;
  source: string;
}
