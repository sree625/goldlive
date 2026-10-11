import "server-only";
import { cacheLife } from "next/cache";
import { DEFAULT_INDIA_PREMIUM_PCT, type HistoryRange } from "./constants";
import { historyDates, karatRates, localPerGram24k } from "./compute";
import { fetchSpotUsd, fetchUsdInr, fetchXauInr } from "./sources";
import type { History, HistoryPoint, LiveQuote } from "./types";

function premiumPct(): number {
  const raw = Number(process.env.INDIA_PREMIUM_PCT);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_INDIA_PREMIUM_PCT;
}

/** USD→INR only moves once a day upstream, so it is cached far longer than the spot price. */
async function getUsdInr(): Promise<number> {
  "use cache";
  cacheLife("hours");
  return fetchUsdInr();
}

/**
 * Latest local rate. Cached for a few seconds so every polling client shares
 * one upstream request instead of each hitting the free API.
 */
export async function getLiveQuote(): Promise<LiveQuote> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 15, expire: 120 });

  const premium = premiumPct();
  try {
    const [spot, usdInr] = await Promise.all([fetchSpotUsd(), getUsdInr()]);
    return {
      rates: karatRates(localPerGram24k(spot.usdPerOunce * usdInr, premium)),
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
      rates: karatRates(localPerGram24k(daily.inrPerOunce, premium)),
      spotUsdPerOunce: null,
      usdInr: null,
      premiumPct: premium,
      updatedAt: new Date(`${daily.date}T00:00:00Z`).toISOString(),
      source: "fawazahmed0/currency-api (daily)",
    };
  }
}

/**
 * A past day never changes, so its snapshot is cached for as long as Next allows.
 * Failures throw rather than return, so a missing day is retried next time.
 */
async function getDailySnapshot(date: string): Promise<HistoryPoint> {
  "use cache";
  cacheLife("max");
  const { inrPerOunce } = await fetchXauInr(date);
  return { date, rates: karatRates(localPerGram24k(inrPerOunce, premiumPct())) };
}

const CONCURRENCY = 10;

export async function getHistory(range: HistoryRange, today: string): Promise<History> {
  "use cache";
  cacheLife("hours");

  const dates = historyDates(range, new Date(`${today}T00:00:00Z`));
  const points: HistoryPoint[] = [];
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const batch = await Promise.allSettled(dates.slice(i, i + CONCURRENCY).map(getDailySnapshot));
    for (const result of batch) if (result.status === "fulfilled") points.push(result.value);
  }
  if (points.length === 0) throw new Error(`No history available for ${range}`);

  return {
    range,
    points,
    premiumPct: premiumPct(),
    source: "fawazahmed0/currency-api",
  };
}
