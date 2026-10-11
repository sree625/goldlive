export const TROY_OUNCE_IN_GRAMS = 31.1034768;

/** Karat number, out of 24. Kerala jewellers derive every karat's rate from the 22K board rate in this ratio. */
export const KARATS = {
  "24K": 24,
  "22K": 22,
  "18K": 18,
  "14K": 14,
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
 * How far the Kerala board rate (set daily by AKGSMA) sits above the
 * international spot price converted to INR. It covers import duty, bank
 * charges and the local market premium.
 *
 * Calibrated on 10 Oct 2026: spot $4,195.60/oz at ₹96.87/$ is ₹13,067/g of
 * fine gold, and the AKGSMA 22K rate was ₹13,880/g, so 13,880 ÷ (13,067 × 22/24) ≈ 1.159.
 * Re-check against the published board rate now and then, and override with
 * KERALA_PREMIUM_PCT when the gap moves.
 */
export const DEFAULT_KERALA_PREMIUM_PCT = 15.9;

/** AKGSMA quotes the 22K rate per gram in steps of ₹5. */
export const BOARD_RATE_STEP = 5;

/** How often the dashboard polls for a fresh quote. */
export const LIVE_REFRESH_MS = 30_000;
