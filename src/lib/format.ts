const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPlain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatInr(value: number): string {
  return inr.format(value);
}

/** "+₹15" / "-₹28" */
export function formatInrDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  return `${sign}₹${inrPlain.format(Math.abs(value))}`;
}

/** "+0.14%" / "-0.27%" */
export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function trend(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

const IST = "Asia/Kolkata";

/** "Sun, 11 Oct 2026" */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST,
  }).format(date);
}

/** "Sun, 11 Oct" from YYYY-MM-DD */
export function formatRowDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "25 Sept" from YYYY-MM-DD */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "12:24:05 pm" in IST */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: IST,
  }).format(date);
}

/** Today's date in India as YYYY-MM-DD. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}
