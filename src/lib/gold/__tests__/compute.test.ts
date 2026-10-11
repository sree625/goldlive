import { describe, expect, it } from "vitest";
import { mergeLive } from "@/hooks/use-gold-series";
import { historyDates, karatRates, localPerGramFine, percentChange, seriesStats } from "../compute";
import type { LiveQuote } from "../types";

describe("localPerGramFine", () => {
  it("converts INR per troy ounce to INR per gram and adds the Kerala premium", () => {
    // 31.1034768 g per ounce, so 311,034.768 INR/oz is exactly 10,000 INR/g before the premium.
    expect(localPerGramFine(311_034.768, 0)).toBeCloseTo(10_000, 6);
    expect(localPerGramFine(311_034.768, 15.9)).toBeCloseTo(11_590, 6);
  });
});

describe("karatRates", () => {
  it("quotes 22K in ₹5 steps and scales other karats from it", () => {
    // 22/24 of 15,140 is 13,878.3, which rounds to the ₹5 step 13,880.
    const rates = karatRates(15_140);
    expect(rates["22K"]).toBe(13_880);
    expect(rates["24K"]).toBe(15_142);
    expect(rates["18K"]).toBe(11_356);
    expect(rates["14K"]).toBe(8_833);
  });

  it("matches the AKGSMA rate on the calibration day", () => {
    // 10 Oct 2026: spot $4,195.60/oz at ₹96.867/$; AKGSMA 22K was ₹13,880.
    const fine = localPerGramFine(4195.6 * 96.867192, 15.9);
    expect(karatRates(fine)["22K"]).toBe(13_880);
  });
});

describe("seriesStats", () => {
  it("finds high, low, average and change", () => {
    const stats = seriesStats([
      { date: "2026-10-01", value: 100 },
      { date: "2026-10-02", value: 120 },
      { date: "2026-10-03", value: 90 },
      { date: "2026-10-04", value: 110 },
    ])!;
    expect(stats.high).toEqual({ value: 120, date: "2026-10-02" });
    expect(stats.low).toEqual({ value: 90, date: "2026-10-03" });
    expect(stats.average).toBe(105);
    expect(stats.changePct).toBeCloseTo(10);
    expect(stats.fromHighPct).toBeCloseTo(percentChange(120, 110));
  });

  it("returns null for an empty series", () => {
    expect(seriesStats([])).toBeNull();
  });
});

describe("historyDates", () => {
  it("lists daily dates ending yesterday", () => {
    expect(historyDates("7d", new Date("2026-10-11T00:00:00Z"))).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("samples a year weekly and still ends yesterday", () => {
    const dates = historyDates("1y", new Date("2026-10-11T00:00:00Z"));
    expect(dates).toHaveLength(53);
    expect(dates.at(-1)).toBe("2026-10-10");
  });
});

describe("mergeLive", () => {
  const rates = karatRates(11_000);
  const live = { rates } as LiveQuote;

  it("appends today's live quote", () => {
    const points = [{ date: "2026-10-10", rates: karatRates(10_900) }];
    expect(mergeLive(points, live, "2026-10-11").map((p) => p.date)).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("replaces a same-day snapshot with the live quote", () => {
    const points = [{ date: "2026-10-11", rates: karatRates(10_900) }];
    expect(mergeLive(points, live, "2026-10-11")).toEqual([{ date: "2026-10-11", rates }]);
  });
});
