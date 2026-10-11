"use client";

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { LIVE_REFRESH_MS, type HistoryRange } from "@/lib/gold/constants";
import type { History, LiveQuote } from "@/lib/gold/types";

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const goldKeys = {
  all: ["gold"] as const,
  live: () => [...goldKeys.all, "live"] as const,
  history: (range: HistoryRange) => [...goldKeys.all, "history", range] as const,
};

export const liveQuoteOptions = queryOptions({
  queryKey: goldKeys.live(),
  queryFn: ({ signal }) => fetchJson<LiveQuote>("/api/gold/latest", signal),
  refetchInterval: LIVE_REFRESH_MS,
  // Keep polling only while the app is on screen; refetchOnWindowFocus catches up on return.
  refetchIntervalInBackground: false,
  staleTime: LIVE_REFRESH_MS / 2,
});

export function historyOptions(range: HistoryRange) {
  return queryOptions({
    queryKey: goldKeys.history(range),
    queryFn: ({ signal }) => fetchJson<History>(`/api/gold/history?range=${range}`, signal),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useLiveQuote() {
  return useQuery(liveQuoteOptions);
}

export function useHistory(range: HistoryRange) {
  // Keep the previous range on screen while a new one loads, so the chart doesn't flash empty.
  return useQuery({ ...historyOptions(range), placeholderData: keepPreviousData });
}
