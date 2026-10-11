import "server-only";
import { cacheLife } from "next/cache";
import { parseBoardRates, pickBoardRates, type BoardRate } from "./board-rate";
import { DEFAULT_KERALA_PREMIUM_PCT, type HistoryRange } from "./constants";
import { historyDates, karatRates, localPerGramFine, ratesFrom22k } from "./compute";
import { fetchKeralaBoardPage, fetchSpotUsd, fetchUsdInr, fetchXauInr } from "./sources";
import type { History, HistoryPoint, LiveQuote } from "./types";

function premiumPct(): number {
  const raw = Number(process.env.KERALA_PREMIUM_PCT);
  return process.env.KERALA_PREMIUM_PCT && Number.isFinite(raw) && raw >= 0
    ? raw
    : DEFAULT_KERALA_PREMIUM_PCT;
}

/** USD→INR only moves once a day upstream, so it is cached far longer than the spot price. */
async function getUsdInr(): Promise<number> {
  "use cache";
  cacheLife("hours");
  return fetchUsdInr();
}

type Estimate = Omit<LiveQuote, "basis" | "boardDate">;

/**
 * Spot-price estimate of the Kerala rate. Cached for a few seconds so every
 * polling client shares one upstream request instead of each hitting the free API.
 */
async function getEstimate(): Promise<Estimate> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 15, expire: 120 });

  const premium = premiumPct();
  try {
    const [spot, usdInr] = await Promise.all([fetchSpotUsd(), getUsdInr()]);
    return {
      rates: karatRates(localPerGramFine(spot.usdPerOunce * usdInr, premium)),
      spotUsdPerOunce: spot.usdPerOunce,
      usdInr,
      premiumPct: premium,
      updatedAt: spot.updatedAt,
      source: "gold-api.com + open.er-api.com",
    };
  } catch (error) {
    console.error("Real-time gold feed failed, using daily rate", error);
    const daily = await fetchXauInr("latest");
    return {
      rates: karatRates(localPerGramFine(daily.inrPerOunce, premium)),
      spotUsdPerOunce: null,
      usdInr: null,
      premiumPct: premium,
      updatedAt: new Date(`${daily.date}T00:00:00Z`).toISOString(),
      source: "fawazahmed0/currency-api (daily)",
    };
  }
}

/**
 * AKGSMA board rates for the last 10 days. The board changes once or twice a
 * day, so a few minutes of caching keeps us current without hammering the page.
 */
async function getBoardRates(): Promise<BoardRate[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return parseBoardRates(await fetchKeralaBoardPage());
}

/** Board rates, or none if the page can't be read; the estimate covers the gap. */
async function tryBoardRates(): Promise<BoardRate[]> {
  try {
    return await getBoardRates();
  } catch (error) {
    console.error("Kerala board rate unavailable, using estimate", error);
    return [];
  }
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

/** The board rate stays in force until the next one, but not over a long gap in the source. */
const MAX_BOARD_AGE_DAYS = 3;

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Latest Kerala rate: the published AKGSMA board rate when there is a recent
 * one, otherwise the live spot-price estimate. Either source alone is enough.
 */
export async function getLiveQuote(today: string): Promise<LiveQuote> {
  const [estimateResult, board] = await Promise.all([
    getEstimate().then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    tryBoardRates(),
  ]);
  const estimate = estimateResult.ok ? estimateResult.value : null;

  // Without a live estimate to check against, trust the rate most rows on the page agree on.
  const expected22k = estimate?.rates["22K"] ?? median(board.map((b) => b.rate22k));
  const current = pickBoardRates(board, () => expected22k)
    .filter((b) => b.date <= today && daysBetween(b.date, today) <= MAX_BOARD_AGE_DAYS)
    .at(-1);

  if (current) {
    return {
      rates: ratesFrom22k(current.rate22k),
      spotUsdPerOunce: estimate?.spotUsdPerOunce ?? null,
      usdInr: estimate?.usdInr ?? null,
      premiumPct: estimate?.premiumPct ?? premiumPct(),
      basis: "board",
      boardDate: current.date,
      updatedAt: estimate?.updatedAt ?? new Date(`${current.date}T00:00:00Z`).toISOString(),
      source: "AKGSMA board rate via goodreturns.in",
    };
  }
  if (estimate) return { ...estimate, basis: "estimate", boardDate: null };
  throw estimateResult.ok ? new Error("No Kerala rate available") : estimateResult.error;
}

/**
 * A past day never changes, so its snapshot is cached for as long as Next allows.
 * Failures throw rather than return, so a missing day is retried next time.
 */
async function getDailySnapshot(date: string): Promise<HistoryPoint> {
  "use cache";
  cacheLife("max");
  const { inrPerOunce } = await fetchXauInr(date);
  return {
    date,
    rates: karatRates(localPerGramFine(inrPerOunce, premiumPct())),
    basis: "estimate",
  };
}

const CONCURRENCY = 10;

async function getEstimatedHistory(range: HistoryRange, today: string): Promise<HistoryPoint[]> {
  "use cache";
  cacheLife("hours");

  const dates = historyDates(range, new Date(`${today}T00:00:00Z`));
  const points: HistoryPoint[] = [];
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const batch = await Promise.allSettled(dates.slice(i, i + CONCURRENCY).map(getDailySnapshot));
    for (const result of batch) if (result.status === "fulfilled") points.push(result.value);
  }
  return points;
}

/** Past rates, using the AKGSMA board rate for the days it covers and estimates before that. */
export async function getHistory(range: HistoryRange, today: string): Promise<History> {
  const [estimated, board] = await Promise.all([
    getEstimatedHistory(range, today),
    tryBoardRates(),
  ]);

  const wanted = new Set(historyDates(range, new Date(`${today}T00:00:00Z`)));
  const byDate = new Map(estimated.map((p) => [p.date, p]));
  const reference = estimated.at(-1)?.rates["22K"];
  const expected = (date: string) => byDate.get(date)?.rates["22K"] ?? reference;
  for (const b of pickBoardRates(board, expected)) {
    if (!wanted.has(b.date)) continue;
    byDate.set(b.date, { date: b.date, rates: ratesFrom22k(b.rate22k), basis: "board" });
  }

  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (points.length === 0) throw new Error(`No history available for ${range}`);

  return {
    range,
    points,
    premiumPct: premiumPct(),
    source: "fawazahmed0/currency-api + AKGSMA board rate",
  };
}
