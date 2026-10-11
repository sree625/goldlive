"use client";

import { useMemo } from "react";
import type { HistoryRange } from "@/lib/gold/constants";
import type { HistoryPoint, LiveQuote } from "@/lib/gold/types";
import { useHistory, useLiveQuote } from "./use-gold";

/** Daily history with today's live quote appended (or replacing a same-day snapshot). */
export function mergeLive(points: HistoryPoint[], live: LiveQuote | undefined, today: string) {
  if (!live) return points;
  const past = points.filter((p) => p.date < today);
  return [...past, { date: today, rates: live.rates }];
}

/** `today` is YYYY-MM-DD in India, or null before the client clock is known. */
export function useGoldSeries(range: HistoryRange, today: string | null) {
  const live = useLiveQuote();
  const history = useHistory(range);
  const points = useMemo(
    () => (today ? mergeLive(history.data?.points ?? [], live.data, today) : []),
    [history.data, live.data, today],
  );
  return { points, live, history };
}
