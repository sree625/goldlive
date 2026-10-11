import "server-only";
import { z } from "zod";

/**
 * Free, keyless upstreams:
 * - gold-api.com: real-time XAU spot in USD per troy ounce.
 * - open.er-api.com: daily USD→INR rate.
 * - fawazahmed0/currency-api: daily XAU→INR snapshots, one file per date, used
 *   for history and as a fallback when the real-time feed is down.
 */

const REQUEST_TIMEOUT_MS = 8_000;

async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return schema.parse(await res.json());
}

async function firstOk<T>(attempts: (() => Promise<T>)[]): Promise<T> {
  const errors: unknown[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      errors.push(error);
    }
  }
  throw new AggregateError(errors, "All upstream sources failed");
}

const goldApiSchema = z.object({
  price: z.number().positive(),
  updatedAt: z.string(),
});

export async function fetchSpotUsd(): Promise<{ usdPerOunce: number; updatedAt: string }> {
  const data = await getJson("https://api.gold-api.com/price/XAU", goldApiSchema);
  return { usdPerOunce: data.price, updatedAt: data.updatedAt };
}

const erApiSchema = z.object({
  result: z.literal("success"),
  rates: z.object({ INR: z.number().positive() }),
});

export async function fetchUsdInr(): Promise<number> {
  const data = await getJson("https://open.er-api.com/v6/latest/USD", erApiSchema);
  return data.rates.INR;
}

const currencyApiSchema = z.object({
  date: z.string(),
  xau: z.object({ inr: z.number().positive() }),
});

/** INR per troy ounce on a given day ("latest" or YYYY-MM-DD). */
export async function fetchXauInr(date: string): Promise<{ inrPerOunce: number; date: string }> {
  const path = "v1/currencies/xau.min.json";
  const data = await firstOk([
    () =>
      getJson(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/${path}`,
        currencyApiSchema,
      ),
    () => getJson(`https://${date}.currency-api.pages.dev/${path}`, currencyApiSchema),
  ]);
  return { inrPerOunce: data.xau.inr, date: data.date };
}
