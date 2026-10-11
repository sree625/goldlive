import type { HistoryRange, Karat } from "./constants";

export type KaratRates = Record<Karat, number>;

export interface LiveQuote {
  /** INR per gram, by karat, estimated Kerala board rate. */
  rates: KaratRates;
  /** International spot in USD per troy ounce, when the source gives it. */
  spotUsdPerOunce: number | null;
  usdInr: number | null;
  premiumPct: number;
  /**
   * "board" when `rates` is the published AKGSMA board rate for `boardDate`;
   * "estimate" when it's worked out from the live spot price.
   */
  basis: "board" | "estimate";
  boardDate: string | null;
  /** ISO time the upstream price was last updated. */
  updatedAt: string;
  source: string;
}

export interface HistoryPoint {
  /** YYYY-MM-DD */
  date: string;
  rates: KaratRates;
  basis: "board" | "estimate";
}

export interface History {
  range: HistoryRange;
  points: HistoryPoint[];
  premiumPct: number;
  source: string;
}
