export const TROY_OUNCE_IN_GRAMS = 31.1034768;

/** Purity as a fraction of 24K. */
export const KARATS = {
  "24K": 0.999,
  "22K": 0.916,
  "18K": 0.75,
  "14K": 0.585,
} as const;

export type Karat = keyof typeof KARATS;

/** Karats shown as cards on the dashboard, in display order. */
export const DISPLAY_KARATS = ["22K", "18K", "14K"] as const satisfies readonly Karat[];
export type DisplayKarat = (typeof DISPLAY_KARATS)[number];

export const PURITY_LABEL: Record<Karat, string> = {
  "24K": "99.9% pure",
  "22K": "91.6% pure",
  "18K": "75% pure",
  "14K": "58.5% pure",
};

/** Units a price can be shown in. "8 g" is one sovereign, called a pavan in South India. */
export const WEIGHT_UNITS = [
  { id: "1g", grams: 1, label: "1 g" },
  { id: "8g", grams: 8, label: "8 g · pavan" },
  { id: "10g", grams: 10, label: "10 g" },
] as const;

export type WeightUnitId = (typeof WEIGHT_UNITS)[number]["id"];

export const HISTORY_RANGES = {
  "7d": { days: 7, stepDays: 1, label: "7D" },
  "30d": { days: 30, stepDays: 1, label: "30D" },
  "90d": { days: 90, stepDays: 1, label: "90D" },
  "1y": { days: 365, stepDays: 7, label: "1Y" },
} as const;

export type HistoryRange = keyof typeof HISTORY_RANGES;

export function isHistoryRange(value: string | null): value is HistoryRange {
  return value !== null && value in HISTORY_RANGES;
}

/**
 * International spot prices exclude Indian import duty, so the local rate is
 * spot plus this premium (basic customs duty 5% + AIDC 1% since July 2024).
 * Override with INDIA_PREMIUM_PCT when duty changes.
 */
export const DEFAULT_INDIA_PREMIUM_PCT = 6;

/** How often the dashboard polls for a fresh quote. */
export const LIVE_REFRESH_MS = 30_000;
