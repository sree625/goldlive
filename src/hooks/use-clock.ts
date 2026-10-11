"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, MINUTE / 4);
  return () => clearInterval(id);
}

const getMinute = () => Math.floor(Date.now() / MINUTE);
// The page is prerendered once and reused, so the server must not bake a time into it.
const getServerMinute = () => null;

/** The current time to the minute, or null until the app is running in the browser. */
export function useClock(): Date | null {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  return minute === null ? null : new Date(minute * MINUTE);
}
